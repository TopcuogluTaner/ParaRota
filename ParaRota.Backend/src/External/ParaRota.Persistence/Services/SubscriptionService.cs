using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ParaRota.Application.DTOs.Subscriptions;
using ParaRota.Application.Services;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class SubscriptionService(
    AppDbContext context,
    ILogger<SubscriptionService> logger) : ISubscriptionService
{
    public Task<UserSubscription?> GetForUserAsync(int userId, CancellationToken cancellationToken = default)
        => context.UserSubscriptions.AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);

    public async Task<PremiumStatusDto> GetPremiumStatusAsync(int userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.Now;

        var sub = await context.UserSubscriptions.AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);

        var trialEndsAt = await context.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.TrialEndsAt)
            .FirstOrDefaultAsync(cancellationToken);

        var subActive = sub is not null && GrantsAccess(sub.Status) && (sub.ExpiresAt is null || sub.ExpiresAt > now);
        var inTrial = !subActive && trialEndsAt.HasValue && trialEndsAt.Value > now;
        var isPremium = subActive || inTrial;

        var plan = subActive
            ? NormalizePlan(sub!.ProductId)
            : (inTrial ? "trial" : null);

        // Premium bitiş: aktif abonelik → ExpiresAt; sadece deneme → TrialEndsAt.
        var premiumExpiresAt = subActive ? sub!.ExpiresAt : (inTrial ? trialEndsAt : null);

        return new PremiumStatusDto(isPremium, inTrial, premiumExpiresAt, trialEndsAt, plan);
    }

    public async Task ApplyWebhookAsync(RevenueCatWebhookPayload payload, CancellationToken cancellationToken = default)
    {
        var ev = payload.Event;
        if (ev is null || string.IsNullOrWhiteSpace(ev.Type))
        {
            logger.LogWarning("RevenueCat webhook: boş veya tipsiz olay, atlandı.");
            return;
        }

        // TEST olayı (dashboard "Send test event") — gerçek kullanıcı yok, 200 dön ama işleme.
        if (string.Equals(ev.Type, "TEST", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogInformation("RevenueCat webhook: TEST olayı alındı.");
            return;
        }

        if (!int.TryParse(ev.AppUserId, out var userId))
        {
            // Anonim app_user_id (logIn'den önce satın alma) — eşleyemeyiz, sessiz atla.
            logger.LogWarning("RevenueCat webhook: app_user_id sayısal değil ('{AppUserId}'), atlandı.", ev.AppUserId);
            return;
        }

        var userExists = await context.Users.AnyAsync(u => u.Id == userId, cancellationToken);
        if (!userExists)
        {
            logger.LogWarning("RevenueCat webhook: userId {UserId} bulunamadı, atlandı.", userId);
            return;
        }

        var eventAt = FromUnixMs(ev.EventTimestampMs) ?? DateTime.Now;

        // İzlenen entitlement değilse (premium yoksa) ve EXPIRATION/CANCELLATION değilse atla.
        var touchesPremium = ev.EntitlementIds is null
            || ev.EntitlementIds.Count == 0
            || ev.EntitlementIds.Contains("premium", StringComparer.OrdinalIgnoreCase);
        if (!touchesPremium)
        {
            logger.LogInformation("RevenueCat webhook: premium dışı entitlement, atlandı. type={Type}", ev.Type);
            return;
        }

        var sub = await context.UserSubscriptions
            .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);

        if (sub is null)
        {
            sub = new UserSubscription { UserId = userId, EntitlementId = "premium" };
            context.UserSubscriptions.Add(sub);
        }
        else if (sub.LastEventAt.HasValue && eventAt < sub.LastEventAt.Value)
        {
            // Sıra dışı (eski) olay — daha yeni bir olay zaten işlenmiş, atla.
            logger.LogInformation("RevenueCat webhook: eski olay atlandı. userId={UserId} type={Type}", userId, ev.Type);
            return;
        }
        else if (!string.IsNullOrEmpty(ev.Id) && ev.Id == sub.LastEventId)
        {
            // Aynı olayın yeniden teslimi (RevenueCat retry) — idempotent atla.
            logger.LogInformation("RevenueCat webhook: mükerrer olay atlandı. userId={UserId} eventId={EventId}", userId, ev.Id);
            return;
        }

        sub.Status = MapStatus(ev.Type, ev.PeriodType, sub.Status);
        sub.Store = MapStore(ev.Store, sub.Store);
        sub.ProductId = ev.ProductId ?? sub.ProductId;
        sub.PeriodType = ev.PeriodType ?? sub.PeriodType;
        sub.ExpiresAt = FromUnixMs(ev.ExpirationAtMs) ?? sub.ExpiresAt;
        sub.WillRenew = !IsCancellingEvent(ev.Type);
        sub.RcAppUserId = ev.AppUserId ?? sub.RcAppUserId;
        sub.OriginalTransactionId = ev.OriginalTransactionId ?? sub.OriginalTransactionId;
        sub.LastEventAt = eventAt;
        sub.LastEventId = ev.Id ?? sub.LastEventId;

        await context.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "RevenueCat webhook işlendi. userId={UserId} type={Type} status={Status} expires={Expires}",
            userId, ev.Type, sub.Status, sub.ExpiresAt);
    }

    public async Task<int> ExpireOverdueAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.Now;

        var overdue = await context.UserSubscriptions
            .Where(x => x.ExpiresAt != null
                        && x.ExpiresAt < now
                        && x.Status != SubscriptionStatus.Expired
                        && x.Status != SubscriptionStatus.None)
            .ToListAsync(cancellationToken);

        if (overdue.Count == 0)
            return 0;

        foreach (var s in overdue)
        {
            s.Status = SubscriptionStatus.Expired;
            s.WillRenew = false;
        }

        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Subscriptions expire-check: {Count} abonelik Expired'a düşürüldü.", overdue.Count);
        return overdue.Count;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    // Erişim veren statüler. Cancelled = otomatik yenileme kapatıldı ama dönem sonuna
    // kadar erişim sürer (ExpiresAt > now kontrolü ile birlikte değerlendirilir).
    // internal: HouseholdScope.IsPremiumAsync aynı kararı paylaşır.
    internal static bool GrantsAccess(SubscriptionStatus status) => status
        is SubscriptionStatus.Active
        or SubscriptionStatus.InTrial
        or SubscriptionStatus.GracePeriod
        or SubscriptionStatus.Cancelled;

    private static bool IsCancellingEvent(string? type) => type is not null && (
        type.Equals("CANCELLATION", StringComparison.OrdinalIgnoreCase) ||
        type.Equals("EXPIRATION", StringComparison.OrdinalIgnoreCase) ||
        type.Equals("BILLING_ISSUE", StringComparison.OrdinalIgnoreCase));

    private static SubscriptionStatus MapStatus(string? type, string? periodType, SubscriptionStatus current)
    {
        var isTrial = string.Equals(periodType, "TRIAL", StringComparison.OrdinalIgnoreCase);
        return (type ?? string.Empty).ToUpperInvariant() switch
        {
            "INITIAL_PURCHASE" or "RENEWAL" or "UNCANCELLATION" or "PRODUCT_CHANGE" or "SUBSCRIPTION_EXTENDED" or "NON_RENEWING_PURCHASE"
                => isTrial ? SubscriptionStatus.InTrial : SubscriptionStatus.Active,
            "CANCELLATION" => SubscriptionStatus.Cancelled,
            "BILLING_ISSUE" => SubscriptionStatus.GracePeriod,
            "EXPIRATION" => SubscriptionStatus.Expired,
            _ => current,
        };
    }

    private static SubscriptionStore MapStore(string? store, SubscriptionStore current) =>
        (store ?? string.Empty).ToUpperInvariant() switch
        {
            "APP_STORE" or "MAC_APP_STORE" => SubscriptionStore.AppStore,
            "PLAY_STORE" => SubscriptionStore.PlayStore,
            "STRIPE" or "RC_BILLING" => SubscriptionStore.Stripe,
            _ => current,
        };

    private static string? NormalizePlan(string? productId)
    {
        if (string.IsNullOrWhiteSpace(productId)) return null;
        var p = productId.ToLowerInvariant();
        if (p.Contains("year") || p.Contains("annual")) return "yearly";
        if (p.Contains("month")) return "monthly";
        return productId;
    }

    private static DateTime? FromUnixMs(long? ms)
        => ms is null or <= 0 ? null : DateTimeOffset.FromUnixTimeMilliseconds(ms.Value).LocalDateTime;
}
