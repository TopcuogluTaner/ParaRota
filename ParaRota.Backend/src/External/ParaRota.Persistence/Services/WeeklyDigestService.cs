using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ParaRota.Application.Services;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

/// <summary>
/// Haftalık özet. Her pazartesi (Hangfire <c>weekly-digest</c>) çalışır; geçen haftanın
/// (Pzt–Paz) harcamasını ve bir önceki haftaya göre değişimi kullanıcı başına TEK
/// bildirimde toplar (kişisel + üyesi olduğu aile defterleri — MonthlyDigest ile aynı kapsam).
/// Bildirim sözleşmesi: TitleKey/MessageKey + Payload interpolation (frontend çevirir).
/// </summary>
public class WeeklyDigestService(AppDbContext context, INotificationDispatcher dispatcher, ILogger<WeeklyDigestService> logger) : IWeeklyDigestService
{
    public async Task<int> SendWeeklyDigestsAsync(CancellationToken cancellationToken = default)
    {
        var today = DateTime.Now.Date;
        // Bu haftanın pazartesisi → geçen hafta [pzt, pzt+7), kıyas haftası ondan önceki 7 gün.
        var daysSinceMonday = ((int)today.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
        var thisMonday = today.AddDays(-daysSinceMonday);
        var lastMonday = thisMonday.AddDays(-7);
        var prevMonday = thisMonday.AddDays(-14);

        var userIds = await context.Users.Select(u => u.Id).ToListAsync(cancellationToken);

        var sent = 0;
        var failed = 0;

        foreach (var userId in userIds)
        {
            try
            {
                if (await BuildAndSendAsync(userId, lastMonday, prevMonday, thisMonday, cancellationToken))
                    sent++;
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogWarning(ex, "Weekly digest failed for user {UserId}.", userId);
            }
        }

        logger.LogInformation("Weekly digests for week of {Week:yyyy-MM-dd}: {Sent} sent, {Failed} failed.", lastMonday, sent, failed);
        return sent;
    }

    private async Task<bool> BuildAndSendAsync(int userId, DateTime lastMonday, DateTime prevMonday, DateTime thisMonday, CancellationToken ct)
    {
        // Kullanıcının görebildiği scope'lar: kişisel + aktif aile üyelikleri.
        // Çift taraflı premium kuralı: premium olmayan kullanıcı aile verisine
        // API'de erişemez — bildirim de aile toplamlarını sızdırmamalı.
        var householdIds = await HouseholdScope.IsPremiumAsync(context, userId, ct)
            ? await HouseholdScope.GetActiveHouseholdIdsAsync(context, userId, ct)
            : new List<int>();

        var txBase = context.Transactions.AsNoTracking()
            .Where(x => x.Status == TransactionStatus.Completed
                     && ((x.HouseholdId == null && x.UserId == userId)
                         || (x.HouseholdId != null && householdIds.Contains(x.HouseholdId.Value))));

        var weekTx = txBase.Where(x => x.TransactionDate >= lastMonday && x.TransactionDate < thisMonday);

        // Özet tek para biriminde: haftanın baskın birimi (farklı birimler kur çevrimi
        // olmadan toplanamaz; azınlık birimdeki kayıtlar özete girmez).
        var reportingCurrency = await weekTx
            .GroupBy(x => x.Currency)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .FirstOrDefaultAsync(ct) ?? "TRY";
        txBase = txBase.Where(x => x.Currency == reportingCurrency);
        weekTx = weekTx.Where(x => x.Currency == reportingCurrency);

        var aggregates = await weekTx
            .GroupBy(x => x.Type)
            .Select(g => new { Type = g.Key, Total = g.Sum(x => x.Amount) })
            .ToListAsync(ct);

        var income = aggregates.FirstOrDefault(a => a.Type == TransactionType.Income)?.Total ?? 0m;
        var expense = aggregates.FirstOrDefault(a => a.Type == TransactionType.Expense)?.Total ?? 0m;
        if (income == 0m && expense == 0m) return false; // hareketsiz hafta → özet yok (gürültü olmasın)

        // Kıyas: bir önceki haftanın gideri → değişim yüzdesi (önceki hafta 0 ise yüzde yok).
        var prevExpense = await txBase
            .Where(x => x.Type == TransactionType.Expense
                     && x.TransactionDate >= prevMonday && x.TransactionDate < lastMonday)
            .SumAsync(x => (decimal?)x.Amount, ct) ?? 0m;

        decimal? deltaPct = prevExpense > 0m
            ? Math.Round((expense / prevExpense - 1m) * 100m, 0)
            : null;

        // Haftanın en büyük gider kalemi.
        var topCat = await weekTx
            .Where(x => x.Type == TransactionType.Expense)
            .GroupBy(x => x.Category.Name)
            .Select(g => new { Name = g.Key, Total = g.Sum(x => x.Amount) })
            .OrderByDescending(c => c.Total)
            .FirstOrDefaultAsync(ct);

        // Mesaj gövdesi: kıyas verisi varsa artış/azalış varyantı; yoksa veya değişim
        // %0 ise sade ("%0 fazla" gibi anlamsız kıyas cümlesi kurulmaz).
        var messageKey = deltaPct is null or 0m
            ? "notif_weekly_digest_body_simple"
            : deltaPct > 0
                ? "notif_weekly_digest_body_up"
                : "notif_weekly_digest_body_down";

        var payload = JsonSerializer.Serialize(new
        {
            weekStart = lastMonday.ToString("yyyy-MM-dd"),
            weekEnd = thisMonday.AddDays(-1).ToString("yyyy-MM-dd"),
            income = Math.Round(income),
            expense = Math.Round(expense),
            net = Math.Round(income - expense),
            deltaPct = deltaPct.HasValue ? Math.Abs(deltaPct.Value) : (decimal?)null,
            topCategory = topCat?.Name,
        });

        var isoWeek = ISOWeek.GetWeekOfYear(lastMonday);
        var envelope = new NotificationEnvelope(
            UserId: userId,
            Type: NotificationType.WeeklyDigest,
            Severity: deltaPct.HasValue && deltaPct.Value > 0 ? NotificationSeverity.Warning : NotificationSeverity.Success,
            TitleKey: "notif_weekly_digest_title",
            MessageKey: messageKey,
            Payload: payload,
            RefType: "digest",
            RefId: null,
            DedupKey: $"weekly:{ISOWeek.GetYear(lastMonday)}-W{isoWeek:D2}",
            PushTitle: "Haftalık özetin hazır",
            PushBody: deltaPct is null or 0m
                ? $"Geçen hafta {Math.Round(expense):N0} ₺ harcadın."
                : $"Geçen hafta {Math.Round(expense):N0} ₺ harcadın — önceki haftadan %{Math.Abs(deltaPct.Value):N0} {(deltaPct > 0 ? "fazla" : "az")}.");

        // Dedup hit (retry/manuel tetik) "gönderildi" sayılmaz.
        return await dispatcher.DispatchAsync(envelope, ct);
    }
}
