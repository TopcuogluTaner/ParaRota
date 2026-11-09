using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ParaRota.Application.Services;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

/// <summary>
/// Ay sonu karnesi. Her ayın 1'inde (Hangfire <c>monthly-digest</c>) çalışır; kullanıcının
/// GÖREBİLDİĞİ tüm kayıtları (kişisel + üyesi olduğu aile defterleri) tek karnede toplar —
/// kullanıcı başına TEK bildirim, scope başına ayrı bildirim spam'i yok.
/// Bildirim sözleşmesi: TitleKey/MessageKey + Payload interpolation (frontend çevirir).
/// </summary>
public class MonthlyDigestService(AppDbContext context, INotificationDispatcher dispatcher, ILogger<MonthlyDigestService> logger) : IMonthlyDigestService
{
    public async Task<int> SendMonthlyDigestsAsync(CancellationToken cancellationToken = default)
    {
        var firstOfThisMonth = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
        var prev = firstOfThisMonth.AddMonths(-1);   // karne ayı
        var prev2 = firstOfThisMonth.AddMonths(-2);  // kıyas ayı (en büyük kalemin değişimi)

        var userIds = await context.Users.Select(u => u.Id).ToListAsync(cancellationToken);

        var sent = 0;
        var failed = 0;

        foreach (var userId in userIds)
        {
            try
            {
                if (await BuildAndSendAsync(userId, prev, prev2, cancellationToken))
                    sent++;
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogWarning(ex, "Monthly digest failed for user {UserId}.", userId);
            }
        }

        logger.LogInformation("Monthly digests for {Month:yyyy-MM}: {Sent} sent, {Failed} failed.", prev, sent, failed);
        return sent;
    }

    private async Task<bool> BuildAndSendAsync(int userId, DateTime prev, DateTime prev2, CancellationToken ct)
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

        var monthTx = txBase.Where(x => x.TransactionDate.Year == prev.Year && x.TransactionDate.Month == prev.Month);

        // Karne tek para biriminde: ayın baskın birimi (farklı birimler kur çevrimi
        // olmadan toplanamaz; azınlık birimdeki kayıtlar karneye girmez).
        var reportingCurrency = await monthTx
            .GroupBy(x => x.Currency)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .FirstOrDefaultAsync(ct) ?? "TRY";
        txBase = txBase.Where(x => x.Currency == reportingCurrency);
        monthTx = monthTx.Where(x => x.Currency == reportingCurrency);

        var aggregates = await monthTx
            .GroupBy(x => x.Type)
            .Select(g => new { Type = g.Key, Total = g.Sum(x => x.Amount) })
            .ToListAsync(ct);

        var income = aggregates.FirstOrDefault(a => a.Type == TransactionType.Income)?.Total ?? 0m;
        var expense = aggregates.FirstOrDefault(a => a.Type == TransactionType.Expense)?.Total ?? 0m;
        if (income == 0m && expense == 0m) return false; // hareketsiz ay → karne yok
        var net = income - expense;

        // En büyük gider kalemi + bir önceki aya göre değişimi.
        var topCat = await monthTx
            .Where(x => x.Type == TransactionType.Expense)
            .GroupBy(x => new { x.CategoryId, x.Category.Name })
            .Select(g => new { g.Key.CategoryId, g.Key.Name, Total = g.Sum(x => x.Amount) })
            .OrderByDescending(c => c.Total)
            .FirstOrDefaultAsync(ct);

        decimal? topDeltaPct = null;
        if (topCat is not null)
        {
            var prevTotal = await txBase
                .Where(x => x.Type == TransactionType.Expense
                         && x.CategoryId == topCat.CategoryId
                         && x.TransactionDate.Year == prev2.Year && x.TransactionDate.Month == prev2.Month)
                .SumAsync(x => (decimal?)x.Amount, ct) ?? 0m;
            if (prevTotal > 0m)
                topDeltaPct = Math.Round((topCat.Total / prevTotal - 1m) * 100m, 0);
        }

        // Bütçe uyumu: karne ayına ait, kullanıcının görebildiği bütçeler.
        var budgets = await context.Budgets.AsNoTracking()
            .Where(b => b.Month == prev.Month && b.Year == prev.Year
                     && ((b.HouseholdId == null && b.UserId == userId)
                         || (b.HouseholdId != null && householdIds.Contains(b.HouseholdId.Value))))
            .Select(b => new { b.CategoryId, b.HouseholdId, b.UserId, b.MonthlyLimit })
            .ToListAsync(ct);

        var budgetOk = 0;
        foreach (var b in budgets)
        {
            var spent = await context.Transactions.AsNoTracking()
                .Where(x => x.Status == TransactionStatus.Completed
                         && x.Type == TransactionType.Expense
                         && x.Currency == reportingCurrency
                         && x.CategoryId == b.CategoryId
                         && x.TransactionDate.Year == prev.Year && x.TransactionDate.Month == prev.Month
                         && (b.HouseholdId == null
                             ? x.HouseholdId == null && x.UserId == b.UserId
                             : x.HouseholdId == b.HouseholdId))
                .SumAsync(x => (decimal?)x.Amount, ct) ?? 0m;
            if (spent <= b.MonthlyLimit) budgetOk++;
        }

        // Mesaj gövdesi içerik zenginliğine göre seçilir (i18n'de 3 varyant).
        var messageKey = topCat is null
            ? "notif_digest_ready_body_simple"
            : budgets.Count > 0
                ? "notif_digest_ready_body_full"
                : "notif_digest_ready_body";

        var payload = JsonSerializer.Serialize(new
        {
            month = prev.Month,
            year = prev.Year,
            income = Math.Round(income),
            expense = Math.Round(expense),
            net = Math.Round(net),
            budgetOk,
            budgetTotal = budgets.Count,
            topCategory = topCat?.Name,
            topDelta = topDeltaPct,
        });

        var envelope = new NotificationEnvelope(
            UserId: userId,
            Type: NotificationType.MonthlyDigest,
            Severity: net >= 0 ? NotificationSeverity.Success : NotificationSeverity.Warning,
            TitleKey: "notif_digest_ready_title",
            MessageKey: messageKey,
            Payload: payload,
            RefType: "digest",
            RefId: null,
            DedupKey: $"digest:{prev:yyyy-MM}",
            PushTitle: "Ay sonu karnen hazır",
            PushBody: $"Gelir {Math.Round(income):N0} ₺ · Gider {Math.Round(expense):N0} ₺ · Net {Math.Round(net):N0} ₺");

        // Dedup hit (retry/manuel tetik) "gönderildi" sayılmaz.
        return await dispatcher.DispatchAsync(envelope, ct);
    }
}
