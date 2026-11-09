using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ParaRota.Application.DTOs.Dashboard;
using ParaRota.Application.DTOs.Transactions;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class DashboardService(
    AppDbContext context,
    IMapper mapper,
    IBudgetService budgetService,
    ICurrentUserService currentUser) : IDashboardService
{
    private const int MonthlyTrendLength = 6;
    private const int UpcomingHorizonDays = 30;
    private const int UpcomingLimit = 5;
    private const int RecentLimit = 7;
    private const int TopExpenseCategories = 10;

    public async Task<ApiResponse<DashboardSummaryDto>> GetSummaryAsync(int userId, int? month, int? year, CancellationToken cancellationToken = default)
    {
        var now = DateTime.Now;
        var m = month ?? now.Month;
        var y = year ?? now.Year;

        if (m < 1 || m > 12)
            return ApiResponse<DashboardSummaryDto>.Fail("Geçersiz ay.", 400, errorCode: ErrorCodes.InvalidMonth);
        if (y < 2000 || y > 2100)
            return ApiResponse<DashboardSummaryDto>.Fail("Geçersiz yıl.", 400, errorCode: ErrorCodes.InvalidYear);

        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        // Aktif scope'taki tüm transactions için ortak base query.
        // Aile scope = household-native; kişisel scope = sahibinin kişiselleri.
        // Hem listeler (recent/upcoming) hem agregasyonlar aynı set üzerinde — çift sayım yok.
        IQueryable<Domain.Entities.Transaction> txBase = scope.HasValue
            ? context.Transactions.AsNoTracking().Where(x => x.HouseholdId == scope.Value)
            : context.Transactions.AsNoTracking().Where(x => x.HouseholdId == null && x.UserId == userId);

        // Agregasyonlar tek para biriminde: farklı birimler kur çevrimi olmadan toplanamaz
        // (100 USD + 100 TRY ≠ 200). Listeler (recent/upcoming) filtrelenmez.
        var reportingCurrency = await HouseholdScope.ResolveReportingCurrencyAsync(context, userId, scope, cancellationToken);
        IQueryable<Domain.Entities.Transaction> txReporting = txBase.Where(x => x.Currency == reportingCurrency);

        // ── Seçilen ayın aggregates (income/expense) ──
        var monthAggregates = await txReporting
            .Where(x => x.Status == TransactionStatus.Completed
                     && x.TransactionDate.Year == y
                     && x.TransactionDate.Month == m)
            .GroupBy(x => x.Type)
            .Select(g => new { Type = g.Key, Total = g.Sum(x => x.Amount) })
            .ToListAsync(cancellationToken);

        var income = monthAggregates.FirstOrDefault(a => a.Type == TransactionType.Income)?.Total ?? 0m;
        var expense = monthAggregates.FirstOrDefault(a => a.Type == TransactionType.Expense)?.Total ?? 0m;
        var net = income - expense;
        var savingsRate = income > 0 ? (double)(net / income) : 0d;

        // ── Son 6 ayın trend'i (seçilen aydan geriye) ──
        var endOfMonth = new DateTime(y, m, 1).AddMonths(1).AddTicks(-1);
        var startOfTrend = new DateTime(y, m, 1).AddMonths(-(MonthlyTrendLength - 1));

        var trendRows = await txReporting
            .Where(x => x.Status == TransactionStatus.Completed
                     && x.TransactionDate >= startOfTrend
                     && x.TransactionDate <= endOfMonth)
            .GroupBy(x => new { x.TransactionDate.Year, x.TransactionDate.Month, x.Type })
            .Select(g => new { g.Key.Year, g.Key.Month, g.Key.Type, Total = g.Sum(x => x.Amount) })
            .ToListAsync(cancellationToken);

        var trend = new List<MonthlyTrendPointDto>(MonthlyTrendLength);
        for (var i = MonthlyTrendLength - 1; i >= 0; i--)
        {
            var d = new DateTime(y, m, 1).AddMonths(-i);
            var inc = trendRows.FirstOrDefault(r => r.Year == d.Year && r.Month == d.Month && r.Type == TransactionType.Income)?.Total ?? 0m;
            var exp = trendRows.FirstOrDefault(r => r.Year == d.Year && r.Month == d.Month && r.Type == TransactionType.Expense)?.Total ?? 0m;
            trend.Add(new MonthlyTrendPointDto
            {
                MonthKey = MonthKey(d.Month),
                Income = inc,
                Expense = exp,
            });
        }

        // ── Top gider kategorileri (seçilen ay) ──
        var topCatsRaw = await txReporting
            .Include(x => x.Category)
            .Where(x => x.Type == TransactionType.Expense
                     && x.Status == TransactionStatus.Completed
                     && x.TransactionDate.Year == y
                     && x.TransactionDate.Month == m)
            .GroupBy(x => new { x.CategoryId, x.Category.Name, x.Category.Color })
            .Select(g => new
            {
                g.Key.CategoryId,
                g.Key.Name,
                g.Key.Color,
                Total = g.Sum(x => x.Amount),
            })
            .ToListAsync(cancellationToken);

        var topCats = topCatsRaw
            .OrderByDescending(c => c.Total)
            .Take(TopExpenseCategories)
            .Select(c => new CategoryShareDto
            {
                CategoryId = c.CategoryId,
                Name = c.Name,
                Color = string.IsNullOrWhiteSpace(c.Color) ? "#5A6E7C" : c.Color,
                Amount = c.Total,
                Share = expense > 0 ? (double)(c.Total / expense) : 0d,
            })
            .ToList();

        // ── Yaklaşan planlı giderler (önümüzdeki 30 gün, ilk 5) ──
        var todayStart = now.Date;
        var horizon = todayStart.AddDays(UpcomingHorizonDays);
        var upcomingEntities = await txBase
            .Include(x => x.Category)
            .Where(x => x.Status == TransactionStatus.Planned
                     && x.Type == TransactionType.Expense
                     && x.TransactionDate >= todayStart
                     && x.TransactionDate <= horizon)
            .OrderBy(x => x.TransactionDate)
            .Take(UpcomingLimit)
            .ToListAsync(cancellationToken);

        // ── Son 7 tamamlanmış hareket ──
        var recentEntities = await txBase
            .Include(x => x.Category)
            .Where(x => x.Status == TransactionStatus.Completed)
            .OrderByDescending(x => x.TransactionDate)
            .ThenByDescending(x => x.Id)
            .Take(RecentLimit)
            .ToListAsync(cancellationToken);

        var summary = new DashboardSummaryDto
        {
            Month = m,
            Year = y,
            Income = income,
            Expense = expense,
            Net = net,
            SavingsRate = savingsRate,
            MonthlyTrend = trend,
            TopExpensesByCategory = topCats,
            UpcomingPayments = mapper.Map<List<TransactionDto>>(upcomingEntities),
            RecentTransactions = mapper.Map<List<TransactionDto>>(recentEntities),
            BudgetStatuses = await budgetService.GetStatusForDashboardAsync(userId, m, y, cancellationToken),
        };

        return ApiResponse<DashboardSummaryDto>.Success(summary);
    }

    private static string MonthKey(int month) => month switch
    {
        1 => "month_short_jan",
        2 => "month_short_feb",
        3 => "month_short_mar",
        4 => "month_short_apr",
        5 => "month_short_may",
        6 => "month_short_jun",
        7 => "month_short_jul",
        8 => "month_short_aug",
        9 => "month_short_sep",
        10 => "month_short_oct",
        11 => "month_short_nov",
        12 => "month_short_dec",
        _ => "month_short_jan",
    };

    // ── Kural bazlı içgörüler ────────────────────────────────────────────────

    private const decimal SpikeMinPreviousAmount = 100m;  // kıyas ayında en az bu kadar harcama olmalı (gürültü filtresi)
    private const decimal SpikeMinPercent = 30m;          // bu eşiğin altındaki artış içgörü değil
    private const double BudgetPaceThreshold = 0.8;       // ay bitmeden bütçenin bu oranı dolduysa uyar
    private const int BudgetPaceMaxDay = 24;              // ayın sonuna yaklaşınca "hızlı tüketim" uyarısı anlamsızlaşır
    private const decimal SavingsRateMinPercent = 10m;    // küçük oranlar için tebrik üretme
    private const int MaxInsights = 3;

    public async Task<ApiResponse<IReadOnlyList<InsightDto>>> GetInsightsAsync(int userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.Now;
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        IQueryable<Domain.Entities.Transaction> txBase = scope.HasValue
            ? context.Transactions.AsNoTracking().Where(x => x.HouseholdId == scope.Value)
            : context.Transactions.AsNoTracking().Where(x => x.HouseholdId == null && x.UserId == userId);

        // Tüm içgörü kuralları upcomingWeek ile aynı para birimi disiplinini izler:
        // yalnız TRY — farklı para birimlerinin ham toplamı yüzdeleri anlamsızlaştırır.
        var monthTx = txBase.Where(x => x.Status == TransactionStatus.Completed
                                     && x.Currency == "TRY"
                                     && x.TransactionDate.Year == now.Year
                                     && x.TransactionDate.Month == now.Month);
        var prev = new DateTime(now.Year, now.Month, 1).AddMonths(-1);

        var insights = new List<InsightDto>();

        // 1) Kategori sıçraması: bu ay vs geçen ay, en yüksek artışlı gider kalemi.
        // İki taraf da yalnız CategoryId ile gruplanır — Category join'i soft-delete
        // filtresine takılıp bu-ay toplamlarını sessizce düşürmesin (ad ayrıca çekilir).
        var thisByCat = await monthTx
            .Where(x => x.Type == TransactionType.Expense)
            .GroupBy(x => x.CategoryId)
            .Select(g => new { CategoryId = g.Key, Total = g.Sum(x => x.Amount) })
            .ToListAsync(cancellationToken);
        var prevByCat = await txBase
            .Where(x => x.Status == TransactionStatus.Completed
                     && x.Type == TransactionType.Expense
                     && x.Currency == "TRY"
                     && x.TransactionDate.Year == prev.Year
                     && x.TransactionDate.Month == prev.Month)
            .GroupBy(x => x.CategoryId)
            .Select(g => new { CategoryId = g.Key, Total = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(g => g.CategoryId, g => g.Total, cancellationToken);

        var spike = thisByCat
            .Where(c => prevByCat.TryGetValue(c.CategoryId, out var p) && p >= SpikeMinPreviousAmount && c.Total > p)
            .Select(c => new { c.CategoryId, Percent = Math.Round((c.Total / prevByCat[c.CategoryId] - 1m) * 100m, 0) })
            .Where(c => c.Percent >= SpikeMinPercent)
            .OrderByDescending(c => c.Percent)
            .FirstOrDefault();
        if (spike is not null)
        {
            var spikeCategoryName = await context.Categories.AsNoTracking()
                .IgnoreQueryFilters()
                .Where(c => c.Id == spike.CategoryId)
                .Select(c => c.Name)
                .FirstOrDefaultAsync(cancellationToken) ?? string.Empty;
            insights.Add(new InsightDto
            {
                Key = "categorySpike",
                Severity = "warning",
                Params = new() { ["category"] = spikeCategoryName, ["percent"] = spike.Percent },
            });
        }

        // 2) Bütçe hızı: ay bitmeden %80+ dolan bütçelerden en kötüsü.
        var budgets = await context.Budgets.AsNoTracking()
            .Where(b => b.Month == now.Month && b.Year == now.Year
                     && (scope.HasValue ? b.HouseholdId == scope.Value
                                        : b.HouseholdId == null && b.UserId == userId))
            .Select(b => new { b.CategoryId, b.Category!.Name, b.MonthlyLimit })
            .ToListAsync(cancellationToken);
        if (budgets.Count > 0 && now.Day <= BudgetPaceMaxDay)
        {
            var spentByCat = thisByCat.ToDictionary(c => c.CategoryId, c => c.Total);
            var worst = budgets
                .Where(b => b.MonthlyLimit > 0)
                .Select(b => new { b.Name, Usage = (double)(spentByCat.GetValueOrDefault(b.CategoryId) / b.MonthlyLimit) })
                .Where(b => b.Usage >= BudgetPaceThreshold && b.Usage < 1.0) // aşım zaten bildirimle uyarılıyor
                .OrderByDescending(b => b.Usage)
                .FirstOrDefault();
            if (worst is not null)
                insights.Add(new InsightDto
                {
                    Key = "budgetPace",
                    Severity = "warning",
                    Params = new() { ["category"] = worst.Name, ["percent"] = Math.Round(worst.Usage * 100), ["day"] = now.Day },
                });
        }

        // 3) Tasarruf oranı / harcama aşımı.
        var totals = await monthTx
            .GroupBy(x => x.Type)
            .Select(g => new { Type = g.Key, Total = g.Sum(x => x.Amount) })
            .ToListAsync(cancellationToken);
        var income = totals.FirstOrDefault(a => a.Type == TransactionType.Income)?.Total ?? 0m;
        var expense = totals.FirstOrDefault(a => a.Type == TransactionType.Expense)?.Total ?? 0m;
        if (income > 0)
        {
            if (income > expense)
            {
                var rate = Math.Round((income - expense) / income * 100m, 0);
                if (rate >= SavingsRateMinPercent)
                    insights.Add(new InsightDto
                    {
                        Key = "savingsRate",
                        Severity = "success",
                        Params = new() { ["percent"] = rate },
                    });
            }
            else if (expense > income * 1.1m)
            {
                insights.Add(new InsightDto
                {
                    Key = "overspend",
                    Severity = "warning",
                    Params = new() { ["percent"] = Math.Round((expense / income - 1m) * 100m, 0) },
                });
            }
        }

        // 4) Yaklaşan hafta: 7 gün içinde koşacak tekrarlayan gider kuralları.
        //    Sayaç ve tutar AYNI kümeden (yalnız TRY) hesaplanır — "3 ödeme var: ₺0"
        //    gibi çelişki olmasın; hiç TRY kuralı yoksa içgörü üretilmez.
        var weekEnd = now.Date.AddDays(7);
        var upcoming = await (scope.HasValue
                ? context.RecurringRules.AsNoTracking().Where(r => r.HouseholdId == scope.Value)
                : context.RecurringRules.AsNoTracking().Where(r => r.HouseholdId == null && r.UserId == userId))
            .Where(r => r.IsActive
                     && r.Type == TransactionType.Expense
                     && r.Currency == "TRY"
                     && r.NextRunDate >= now.Date && r.NextRunDate < weekEnd
                     && r.PayrollGrossMonthly == null)
            .Select(r => r.Amount)
            .ToListAsync(cancellationToken);
        if (upcoming.Count > 0)
        {
            insights.Add(new InsightDto
            {
                Key = "upcomingWeek",
                Severity = "info",
                Params = new()
                {
                    ["count"] = upcoming.Count,
                    ["amount"] = upcoming.Sum(),
                },
            });
        }

        // Uyarılar önce, sonra başarı, sonra bilgi; en fazla MaxInsights.
        var ordered = insights
            .OrderBy(i => i.Severity switch { "warning" => 0, "success" => 1, _ => 2 })
            .Take(MaxInsights)
            .ToList();

        return ApiResponse<IReadOnlyList<InsightDto>>.Success(ordered);
    }
}
