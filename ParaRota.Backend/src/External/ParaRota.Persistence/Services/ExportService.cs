using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ParaRota.Application.DTOs.Exports;
using ParaRota.Application.Services;
using ParaRota.Application.Services.Reporting;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

/// <summary>
/// Faz 4 — Export service (V1 PDF + V2 Excel).
///
/// <para>
/// Scope: aile scope = household-native kayıtlar, kişisel scope = sahibinin kişiselleri.
/// </para>
///
/// <para>
/// Template generation Infrastructure katmanına bırakıldı (QuestPDF/ClosedXML).
/// Bu servis sadece DB query + summary build + generator çağırma sorumluluğunda.
/// </para>
/// </summary>
public class ExportService(
    AppDbContext context,
    ICurrentUserService currentUser,
    IPdfReportGenerator pdfGenerator,
    IXlsxReportGenerator xlsxGenerator,
    ILogger<ExportService> logger) : IExportService
{
    private const int MaxXlsxRows = 50_000;
    private const int MaxDateRangeMonths = 12;
    private const int TopTransactionsCount = 10;

    public async Task<byte[]> GenerateMonthlyPdfAsync(int userId, MonthlyPdfRequest req, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(req);
        if (req.Year is < 2000 or > 2100) throw new InvalidOperationException("Geçersiz yıl.");

        // Months öncelikli; boşsa tekil Month'a düş (geriye dönük uyumluluk).
        var months = (req.Months.Count > 0 ? req.Months : (req.Month is int m ? [m] : new List<int>()))
            .Where(x => x is >= 1 and <= 12)
            .Distinct()
            .OrderBy(x => x)
            .ToList();
        if (months.Count == 0) throw new InvalidOperationException("En az bir geçerli ay seçilmeli.");

        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);
        logger.LogInformation(
            "MonthlyPdf request: user={UserId}, scope={Scope}, year={Year}, months=[{Months}], layout={Layout}, includeTx={IncludeTx}",
            userId, scope, req.Year, string.Join(",", months), req.Layout, req.IncludeTransactions);

        IQueryable<Transaction> txReporting = scope.HasValue
            ? context.Transactions.AsNoTracking()
                .Where(x => x.HouseholdId == scope.Value)
            : context.Transactions.AsNoTracking()
                .Where(x => x.HouseholdId == null && x.UserId == userId);

        // Seçili ayların min..max aralığını tek sorguda çekip bellekte ayrıştırıyoruz
        // (aylar bitişik değilse aşağıda ay seti ile filtreleniyor).
        var rangeStart = new DateTime(req.Year, months[0], 1);
        var rangeEnd = new DateTime(req.Year, months[^1], 1).AddMonths(1).AddTicks(-1);
        var monthSet = months.ToHashSet();

        // PDF tek para birimiyle etiketlenir (aşağıda ResolveOwnerInfoAsync) — toplamlara
        // farklı birimli işlemler kur çevrimi olmadan karışmasın.
        var reportingCurrency = await HouseholdScope.ResolveReportingCurrencyAsync(context, userId, scope, cancellationToken);

        var rows = await txReporting
            .Where(x => x.Status == TransactionStatus.Completed
                     && x.Currency == reportingCurrency
                     && x.TransactionDate >= rangeStart
                     && x.TransactionDate <= rangeEnd)
            .Include(x => x.Category)
            .Select(x => new TxLite(
                x.TransactionDate,
                x.Type,
                x.Amount,
                x.Category.Name,
                x.Category.Color,
                x.Notes))
            .ToListAsync(cancellationToken);

        var selectedRows = rows.Where(r => monthSet.Contains(r.Date.Month)).ToList();

        List<MonthlyPdfSection> sections;
        if (req.Layout == MonthlyPdfLayout.PerMonth && months.Count > 1)
        {
            sections = months
                .Select(month => BuildSection(
                    [month],
                    selectedRows.Where(r => r.Date.Month == month),
                    req.IncludeTransactions))
                .ToList();
        }
        else
        {
            // Combined (veya tek ay): seçili tüm aylar tek bölümde birleşir.
            sections = [BuildSection(months, selectedRows, req.IncludeTransactions)];
        }

        var (ownerDisplayName, _) = await ResolveOwnerInfoAsync(userId, scope, cancellationToken);
        // Etiket, toplamların gerçekten hesaplandığı birim olmalı (kişisel scope'ta baskın birim).
        var currency = reportingCurrency;

        var model = new MonthlyPdfModel(
            OwnerDisplayName: ownerDisplayName,
            Year: req.Year,
            Currency: currency,
            Layout: req.Layout,
            IncludeTransactions: req.IncludeTransactions,
            Sections: sections);

        return pdfGenerator.RenderMonthlySummary(model);
    }

    /// <summary>Verilen işlem alt kümesinden bir rapor bölümü (özet + kategori + opsiyonel işlem) kurar.</summary>
    private static MonthlyPdfSection BuildSection(IReadOnlyList<int> sectionMonths, IEnumerable<TxLite> source, bool includeTransactions)
    {
        var rows = source as IList<TxLite> ?? source.ToList();

        var totalIncome = rows.Where(r => r.Type == TransactionType.Income).Sum(r => r.Amount);
        var totalExpense = rows.Where(r => r.Type == TransactionType.Expense).Sum(r => r.Amount);

        var categoryBreakdowns = rows
            .Where(r => r.Type == TransactionType.Expense)
            .GroupBy(r => new { r.CategoryName, r.CategoryColor })
            .Select(g => new { g.Key.CategoryName, g.Key.CategoryColor, Total = g.Sum(x => x.Amount) })
            .OrderByDescending(c => c.Total)
            .Select(c => new CategoryBreakdown(
                CategoryName: c.CategoryName ?? "—",
                Color: c.CategoryColor ?? "#5A6E7C",
                Total: c.Total,
                PercentOfExpense: totalExpense > 0 ? (double)(c.Total / totalExpense) : 0d))
            .ToList();

        var topTransactions = includeTransactions
            ? rows
                .OrderByDescending(r => r.Amount)
                .Take(TopTransactionsCount)
                .Select(r => new TopTransaction(
                    Date: r.Date,
                    Category: r.CategoryName ?? "—",
                    Amount: r.Amount,
                    IsIncome: r.Type == TransactionType.Income,
                    Notes: r.Notes))
                .ToList()
            : [];

        return new MonthlyPdfSection(
            Months: sectionMonths,
            TotalIncome: totalIncome,
            TotalExpense: totalExpense,
            Net: totalIncome - totalExpense,
            CategoryBreakdowns: categoryBreakdowns,
            TopTransactions: topTransactions);
    }

    /// <summary>Bellekte ayrıştırma için minimal işlem projeksiyonu.</summary>
    private sealed record TxLite(DateTime Date, TransactionType Type, decimal Amount, string? CategoryName, string? CategoryColor, string? Notes);

    public async Task<byte[]> GenerateTransactionsXlsxAsync(int userId, TransactionsXlsxRequest req, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(req);
        if (req.EndDate < req.StartDate) throw new InvalidOperationException("Bitiş tarihi başlangıçtan önce olamaz.");
        var spanMonths = ((req.EndDate.Year - req.StartDate.Year) * 12) + (req.EndDate.Month - req.StartDate.Month);
        if (spanMonths > MaxDateRangeMonths)
            throw new InvalidOperationException($"Tarih aralığı maksimum {MaxDateRangeMonths} ay olabilir.");

        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);
        logger.LogInformation(
            "TransactionsXlsx request: user={UserId}, scope={Scope}, range={Start}..{End}, cats={CatCount}, types={Types}",
            userId, scope, req.StartDate.ToString("yyyy-MM-dd"), req.EndDate.ToString("yyyy-MM-dd"),
            req.CategoryIds?.Count ?? 0, req.Types is null ? "all" : string.Join(",", req.Types));

        // Excel listing — aktif scope'taki kayıtlar.
        IQueryable<Transaction> txBase = scope.HasValue
            ? context.Transactions.AsNoTracking()
                .Where(x => x.HouseholdId == scope.Value)
            : context.Transactions.AsNoTracking()
                .Where(x => x.HouseholdId == null && x.UserId == userId);

        var q = txBase.Where(x => x.TransactionDate >= req.StartDate && x.TransactionDate <= req.EndDate);
        if (req.CategoryIds is { Count: > 0 }) q = q.Where(x => req.CategoryIds.Contains(x.CategoryId));
        if (req.Types is { Count: > 0 })
        {
            var types = req.Types.ToList();
            q = q.Where(x => types.Contains(x.Type));
        }

        var count = await q.CountAsync(cancellationToken);
        if (count > MaxXlsxRows)
            throw new InvalidOperationException($"Sorgu {count} satır içeriyor; maksimum {MaxXlsxRows}. Lütfen tarih aralığını daralt.");

        var raw = await q
            .Include(x => x.Category)
            .Include(x => x.User)
            .OrderBy(x => x.TransactionDate)
            .Select(x => new
            {
                x.TransactionDate,
                x.Type,
                CategoryName = x.Category.Name,
                x.Amount,
                x.Currency,
                x.Notes,
                x.Source,
                CreatedByFirst = x.User.FirstName,
                CreatedByLast = x.User.LastName,
            })
            .ToListAsync(cancellationToken);

        var rows = raw.Select(r => new TransactionRow(
            Date: r.TransactionDate,
            Type: r.Type == TransactionType.Income ? "Gelir" : "Gider",
            Category: r.CategoryName ?? "—",
            Amount: r.Amount,
            Currency: r.Currency,
            Notes: r.Notes,
            Source: r.Source.ToString(),
            CreatedByName: $"{r.CreatedByFirst} {r.CreatedByLast}".Trim()))
            .ToList();

        return xlsxGenerator.RenderTransactions(rows);
    }

    /// <summary>
    /// Owner adı + para birimi belirler. Household scope'ta → household.Name + household.Currency.
    /// Kişisel scope'ta → user.FirstName + LastName ve "TRY" (V1 tek currency varsayımı).
    /// </summary>
    private async Task<(string ownerName, string currency)> ResolveOwnerInfoAsync(int userId, int? scope, CancellationToken ct)
    {
        if (scope.HasValue)
        {
            var hh = await context.Households.AsNoTracking()
                .Where(h => h.Id == scope.Value)
                .Select(h => new { h.Name, h.Currency })
                .FirstOrDefaultAsync(ct);
            if (hh is not null) return (hh.Name, hh.Currency);
        }

        var user = await context.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.FirstName, u.LastName, u.Email })
            .FirstOrDefaultAsync(ct);
        if (user is null) return ("—", "TRY");

        var name = $"{user.FirstName} {user.LastName}".Trim();
        return (string.IsNullOrEmpty(name) ? (user.Email ?? "—") : name, "TRY");
    }
}
