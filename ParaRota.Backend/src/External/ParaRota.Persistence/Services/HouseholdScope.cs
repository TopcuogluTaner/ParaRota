using Microsoft.EntityFrameworkCore;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

/// <summary>Açık householdId ile gelen isteklerde erişim kontrolü sonucu.</summary>
internal enum HouseholdAccess
{
    Ok = 0,
    NotMember = 1,       // üyelik yok → HOUSEHOLD_ACCESS_DENIED
    PremiumRequired = 2, // üyelik var ama premium yok → PREMIUM_REQUIRED (paywall)
}

/// <summary>
/// Household-aware servis sorguları için ortak yardımcılar.
/// Kullanıcının erişebileceği household ID'lerini tek bir noktadan alıp,
/// 5 service ortak filter mantığını paylaşır.
///
/// Çift taraflı premium kuralı: aile VERİSİNE erişim üyelik + premium ister;
/// üyelik (veri modeli gerçeği) ile premium (ticari kural) ayrı sorulardır —
/// IsActiveMemberAsync saf üyelik kontrolüdür, premium'u içermez.
/// </summary>
internal static class HouseholdScope
{
    /// <summary>
    /// Kullanıcının aktif member olduğu household ID'lerini döner (premium'dan bağımsız —
    /// üyelik gerçeği; veri erişimi için ayrıca premium gerekir).
    /// </summary>
    public static Task<List<int>> GetActiveHouseholdIdsAsync(AppDbContext context, int userId, CancellationToken cancellationToken)
        => context.HouseholdMembers
            .AsNoTracking()
            .Where(m => m.UserId == userId && m.Status == HouseholdMemberStatus.Active)
            .Select(m => m.HouseholdId)
            .ToListAsync(cancellationToken);

    /// <summary>Kullanıcı verilen household'da aktif üye mi? (saf üyelik — premium İÇERMEZ)</summary>
    public static Task<bool> IsActiveMemberAsync(AppDbContext context, int userId, int householdId, CancellationToken cancellationToken)
        => context.HouseholdMembers
            .AsNoTracking()
            .AnyAsync(m => m.HouseholdId == householdId
                        && m.UserId == userId
                        && m.Status == HouseholdMemberStatus.Active,
                      cancellationToken);

    /// <summary>
    /// Açık householdId ile gelen yazma/okuma istekleri için iki aşamalı kontrol:
    /// üye değilse NotMember (yanlış "premium al" mesajı verilmesin), üye ama premium
    /// değilse PremiumRequired (paywall'a doğru yönlendirme). Çağıran, sonuca göre
    /// HOUSEHOLD_ACCESS_DENIED / PREMIUM_REQUIRED errorCode'u döndürmelidir.
    /// </summary>
    public static async Task<HouseholdAccess> CheckMemberAccessAsync(AppDbContext context, int userId, int householdId, CancellationToken cancellationToken)
    {
        if (!await IsActiveMemberAsync(context, userId, householdId, cancellationToken))
            return HouseholdAccess.NotMember;
        return await IsPremiumAsync(context, userId, cancellationToken)
            ? HouseholdAccess.Ok
            : HouseholdAccess.PremiumRequired;
    }

    /// <summary>
    /// Aktif scope çözümlemesi. activeHouseholdId null ise kişisel.
    /// Geçerli bir id verilmiş ama kullanıcı üye değilse VEYA premium değilse
    /// kişisel'e düşer (çift taraflı premium kuralı — premium'u biten üyenin
    /// erişimi askıya alınır, üyeliği silinmez).
    /// </summary>
    public static async Task<int?> ResolveActiveScopeAsync(
        AppDbContext context, int userId, int? activeHouseholdId, CancellationToken ct)
    {
        if (activeHouseholdId is null or 0) return null;
        var isMember = await IsActiveMemberAsync(context, userId, activeHouseholdId.Value, ct);
        if (!isMember) return null;
        return await IsPremiumAsync(context, userId, ct) ? activeHouseholdId.Value : null;
    }

    /// <summary>
    /// Raporlama/agregasyon para birimi. Farklı para birimli tutarlar kur çevrimi olmadan
    /// toplanamaz (100 USD + 100 TRY ≠ 200); Sum içeren sorgular bu birimle filtrelenir —
    /// listelerde tüm kayıtlar görünmeye devam eder. Aile scope'unda ailenin ilan edilmiş
    /// para birimi; kişisel scope'ta kullanıcının en çok kullandığı birim (yoksa TRY) —
    /// böylece defterini USD tutan bir kullanıcının panosu boşalmaz.
    /// </summary>
    public static async Task<string> ResolveReportingCurrencyAsync(
        AppDbContext context, int userId, int? scope, CancellationToken ct)
    {
        if (scope.HasValue)
        {
            var cur = await context.Households.AsNoTracking()
                .Where(h => h.Id == scope.Value)
                .Select(h => h.Currency)
                .FirstOrDefaultAsync(ct);
            return string.IsNullOrWhiteSpace(cur) ? "TRY" : cur;
        }

        var dominant = await context.Transactions.AsNoTracking()
            .Where(x => x.HouseholdId == null && x.UserId == userId)
            .GroupBy(x => x.Currency)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .FirstOrDefaultAsync(ct);
        return string.IsNullOrWhiteSpace(dominant) ? "TRY" : dominant;
    }

    /// <summary>
    /// SubscriptionService.GetPremiumStatusAsync ile aynı karar: aktif abonelik
    /// (GrantsAccess + ExpiresAt) veya süren 30g deneme. Hot path'te DI'sız
    /// çağrılabilsin diye burada yaşar; tek round-trip'te çözülür.
    /// DİKKAT: premium kararının çekirdeği değişirse İKİ yer güncellenmeli
    /// (SubscriptionService.GetPremiumStatusAsync + burası).
    /// </summary>
    public static async Task<bool> IsPremiumAsync(AppDbContext context, int userId, CancellationToken cancellationToken)
    {
        var now = DateTime.Now;

        var snapshot = await context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                u.TrialEndsAt,
                Sub = context.UserSubscriptions
                    .Where(s => s.UserId == userId)
                    .Select(s => new { s.Status, s.ExpiresAt })
                    .FirstOrDefault(),
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (snapshot is null) return false;
        if (snapshot.Sub is not null
            && SubscriptionService.GrantsAccess(snapshot.Sub.Status)
            && (snapshot.Sub.ExpiresAt is null || snapshot.Sub.ExpiresAt > now))
            return true;

        return snapshot.TrialEndsAt.HasValue && snapshot.TrialEndsAt.Value > now;
    }

    /// <summary>
    /// Verilen household'da kullanıcı Owner veya Admin mi?
    /// </summary>
    public static async Task<bool> IsOwnerOrAdminAsync(AppDbContext context, int userId, int householdId, CancellationToken cancellationToken)
    {
        var role = await context.HouseholdMembers
            .AsNoTracking()
            .Where(m => m.HouseholdId == householdId
                     && m.UserId == userId
                     && m.Status == HouseholdMemberStatus.Active)
            .Select(m => (HouseholdMemberRole?)m.Role)
            .FirstOrDefaultAsync(cancellationToken);
        return role == HouseholdMemberRole.Owner || role == HouseholdMemberRole.Admin;
    }
}
