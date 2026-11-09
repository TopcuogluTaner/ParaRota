using System.Text.Json;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class RecurringRuleService(
    AppDbContext context,
    IMapper mapper,
    ILogger<RecurringRuleService> logger,
    INotificationDispatcher dispatcher,
    IPayrollService payroll,
    ICurrentUserService currentUser) : IRecurringRuleService
{
    public async Task<ApiResponse<IReadOnlyList<RecurringRuleDto>>> GetAllAsync(int userId, bool? isActive, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var q = scope.HasValue
            ? context.RecurringRules.AsNoTracking().Include(x => x.Category)
                .Where(x => x.HouseholdId == scope.Value)
            : context.RecurringRules.AsNoTracking().Include(x => x.Category)
                .Where(x => x.HouseholdId == null && x.UserId == userId);

        if (isActive.HasValue)
            q = q.Where(x => x.IsActive == isActive.Value);

        // Memory safety: paginated DTO eklenene kadar 500'lük üst sınır.
        var items = await q
            .OrderByDescending(x => x.IsActive)
            .ThenBy(x => x.NextRunDate)
            .Take(500)
            .ToListAsync(cancellationToken);

        var dtos = mapper.Map<IReadOnlyList<RecurringRuleDto>>(items);

        // Taksit planlarının ödenen taksit sayısı: tek GROUP BY ile (N+1 yok).
        var instIds = items.Where(x => x.InstallmentCount != null).Select(x => x.Id).ToList();
        if (instIds.Count > 0)
        {
            var counts = await context.Transactions.AsNoTracking()
                .Where(t => t.RecurringRuleId != null && instIds.Contains(t.RecurringRuleId.Value))
                .GroupBy(t => t.RecurringRuleId!.Value)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.Id, g => g.Count, cancellationToken);
            foreach (var dto in dtos)
                dto.PaidInstallments = counts.GetValueOrDefault(dto.Id);
        }

        return ApiResponse<IReadOnlyList<RecurringRuleDto>>.Success(dtos);
    }

    public async Task<ApiResponse<SubscriptionRadarDto>> GetSubscriptionRadarAsync(int userId, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        // Abonelik tanımı: sistem "Abonelikler" kategorisindeki gider kuralları;
        // maaş (PayrollGrossMonthly) ve taksit (InstallmentCount) kuralları hariç.
        var subscriptionCategoryId = await context.Categories.AsNoTracking()
            .Where(x => x.IsSystem && x.UserId == null && x.Name == "Abonelikler")
            .Select(x => (int?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var radar = new SubscriptionRadarDto();
        if (subscriptionCategoryId is null)
            return ApiResponse<SubscriptionRadarDto>.Success(radar); // widget dayanıklı kalsın — hata yerine boş

        var baseQuery = scope.HasValue
            ? context.RecurringRules.AsNoTracking().Where(x => x.HouseholdId == scope.Value)
            : context.RecurringRules.AsNoTracking().Where(x => x.HouseholdId == null && x.UserId == userId);

        var rules = await baseQuery
            .Where(x => x.CategoryId == subscriptionCategoryId.Value
                     && x.Type == TransactionType.Expense
                     && x.PayrollGrossMonthly == null
                     && x.InstallmentCount == null)
            .OrderByDescending(x => x.IsActive)
            .ThenByDescending(x => x.Amount)
            .Take(500)
            .ToListAsync(cancellationToken);

        if (rules.Count == 0)
            return ApiResponse<SubscriptionRadarDto>.Success(radar);

        // Zam tespiti: kurala bağlı üretilmiş işlemlerin tarih sıralı tutarlarında
        // son değişikliği bul (kural tutarı güncellenince eski işlemler eski tutarda kalır).
        // Yalnız Completed işlemler (onaylanmamış/reddedilecek Planned'lar fiyat değildir)
        // ve son 2 yıl (günlük kurallarda sınırsız geçmiş belleğe çekilmesin).
        var ruleIds = rules.Select(x => x.Id).ToList();
        var historyCutoff = DateTime.Now.AddYears(-2);
        var txHistory = await context.Transactions.AsNoTracking()
            .Where(t => t.RecurringRuleId != null && ruleIds.Contains(t.RecurringRuleId.Value)
                     && t.Status == TransactionStatus.Completed
                     && t.TransactionDate >= historyCutoff)
            .OrderBy(t => t.TransactionDate)
            .Select(t => new { RuleId = t.RecurringRuleId!.Value, t.TransactionDate, t.Amount, t.Currency })
            .ToListAsync(cancellationToken);
        var historyByRule = txHistory.GroupBy(t => t.RuleId).ToDictionary(g => g.Key, g => g.ToList());

        foreach (var rule in rules)
        {
            SubscriptionPriceChangeDto? priceChange = null;
            // Sahte zam koruması: son işlem tutarı kuralın güncel tutarına eşit olmalı —
            // kullanıcı tek bir işlemi elle düzenlediyse bu "fiyat değişimi" sayılmaz.
            // Para birimi koruması: kuralın para birimi değiştirildiyse eski birimdeki
            // işlemler fiyat geçmişi değildir (USD 10 → TRY 300 zam sayılmasın).
            var history = historyByRule.TryGetValue(rule.Id, out var raw)
                ? raw.Where(h => h.Currency == rule.Currency).ToList()
                : [];
            if (history.Count >= 2 && history[^1].Amount == rule.Amount)
            {
                var current = history[^1].Amount;
                // Sondan geriye: mevcut tutardan FARKLI son tutarı ve değişimin başladığı işlemi bul.
                for (var i = history.Count - 2; i >= 0; i--)
                {
                    if (history[i].Amount == current) continue;
                    var previous = history[i].Amount;
                    var percent = previous > 0 ? Math.Round((current - previous) / previous * 100m, 1) : 0m;
                    // Yuvarlama sonrası %0 kalan mikro değişim gürültüdür — rozet üretme
                    // (istemciler percent>0'ı zam sayar; 0% yeşil "indirim" gibi görünürdü).
                    if (previous > 0 && percent != 0m)
                        priceChange = new SubscriptionPriceChangeDto
                        {
                            PreviousAmount = previous,
                            CurrentAmount = current,
                            Percent = percent,
                            ChangedAt = history[i + 1].TransactionDate,
                        };
                    break;
                }
            }

            radar.Items.Add(new SubscriptionRadarItemDto
            {
                RuleId = rule.Id,
                Description = rule.Description,
                Amount = rule.Amount,
                Currency = rule.Currency,
                Frequency = rule.Frequency,
                IsActive = rule.IsActive,
                NextRunDate = rule.NextRunDate,
                PriceChange = priceChange,
            });
        }

        radar.ActiveCount = rules.Count(x => x.IsActive);
        radar.PausedCount = rules.Count - radar.ActiveCount;

        // Toplamlar: yalnız aktif kurallar, para birimi bazında (kur dönüşümü yok),
        // frekans aylığa normalize edilir.
        radar.Totals = rules
            .Where(x => x.IsActive)
            .GroupBy(x => x.Currency)
            .Select(g => new SubscriptionRadarTotalDto
            {
                Currency = g.Key,
                MonthlyTotal = Math.Round(g.Sum(x => MonthlyEquivalent(x.Amount, x.Frequency)), 2),
                YearlyTotal = Math.Round(g.Sum(x => MonthlyEquivalent(x.Amount, x.Frequency)) * 12m, 2),
            })
            .OrderByDescending(t => t.MonthlyTotal)
            .ToList();

        return ApiResponse<SubscriptionRadarDto>.Success(radar);
    }

    private static decimal MonthlyEquivalent(decimal amount, RecurringFrequency frequency) => frequency switch
    {
        RecurringFrequency.Daily => amount * 365m / 12m,
        RecurringFrequency.Weekly => amount * 52m / 12m,
        RecurringFrequency.Yearly => amount / 12m,
        _ => amount, // Monthly
    };

    public async Task<ApiResponse<Application.DTOs.Dashboard.CashflowForecastDto>> GetCashflowForecastAsync(int userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.Now;
        var today = now.Date;
        var monthStart = new DateTime(now.Year, now.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1); // gösterim için (ayın son günü)
        var nextMonthStart = monthStart.AddMonths(1);        // sorgu sınırı — son günün SAATLİ işlemleri dışta kalmasın

        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        // Bu ay şu ana kadar gerçekleşen (Completed) — dashboard agregasyon sözleşmesi.
        IQueryable<Transaction> txBase = scope.HasValue
            ? context.Transactions.AsNoTracking().Where(x => x.HouseholdId == scope.Value)
            : context.Transactions.AsNoTracking().Where(x => x.HouseholdId == null && x.UserId == userId);
        var actuals = await txBase
            .Where(x => x.Status == TransactionStatus.Completed
                     && x.TransactionDate >= monthStart && x.TransactionDate < nextMonthStart)
            .GroupBy(x => x.Type)
            .Select(g => new { Type = g.Key, Total = g.Sum(x => x.Amount) })
            .ToListAsync(cancellationToken);

        var dto = new Application.DTOs.Dashboard.CashflowForecastDto
        {
            MonthStart = monthStart,
            MonthEnd = monthEnd,
            ActualIncome = actuals.FirstOrDefault(a => a.Type == TransactionType.Income)?.Total ?? 0m,
            ActualExpense = actuals.FirstOrDefault(a => a.Type == TransactionType.Expense)?.Total ?? 0m,
        };
        dto.ActualNet = dto.ActualIncome - dto.ActualExpense;

        // Onay bekleyen (Planned) işlemler: AutoApprove=false kuralların ürettiği ya da
        // elle girilen planlı kayıtlar — gerçekleşene girmediler ama bilinen akıştır;
        // tahmine dahil edilmezse projeksiyon iyimser kalır. (Kural koşu simülasyonu
        // run > today olduğundan bunlarla çakışmaz: koşulmuş tarihler simüle edilmez.)
        var plannedTx = await txBase
            .Where(x => x.Status == TransactionStatus.Planned
                     && x.TransactionDate >= monthStart && x.TransactionDate < nextMonthStart)
            .Select(x => new { x.TransactionDate, x.Type, x.Amount, x.Currency, x.RecurringRuleId, x.Notes, CategoryName = x.Category.Name })
            .ToListAsync(cancellationToken);
        foreach (var tx in plannedTx)
        {
            dto.Items.Add(new Application.DTOs.Dashboard.CashflowItemDto
            {
                Date = tx.TransactionDate.Date,
                RuleId = tx.RecurringRuleId ?? 0,
                // Kuraldan üretilen Planned'ın Notes'u = kural Description'ı; böylece aynı
                // kuralın dünkü (onay bekleyen) ve yarınki (simülasyon) kalemi aynı etiketi taşır.
                Description = string.IsNullOrWhiteSpace(tx.Notes) ? tx.CategoryName : tx.Notes,
                Type = tx.Type,
                Amount = tx.Amount,
                Currency = tx.Currency,
            });
            if (tx.Type == TransactionType.Income) dto.PlannedIncome += tx.Amount;
            else dto.PlannedExpense += tx.Amount;
        }

        // Bugünden ay sonuna planlanan koşular. Bugün ve öncesi DAHİL DEĞİL:
        // günlük job (02:05) bugüne düşenleri zaten üretti/üretecek — Completed ise
        // gerçekleşende, Planned ise yukarıdaki blokta sayıldı; çift sayım olmaz.
        var rules = await (scope.HasValue
                ? context.RecurringRules.AsNoTracking().Where(r => r.HouseholdId == scope.Value)
                : context.RecurringRules.AsNoTracking().Where(r => r.HouseholdId == null && r.UserId == userId))
            .Where(r => r.IsActive && r.NextRunDate < nextMonthStart // saatli NextRunDate ayın son gününe düşerse de dahil
                     && (r.EndDate == null || r.EndDate >= today))
            .ToListAsync(cancellationToken);

        foreach (var rule in rules)
        {
            var run = rule.NextRunDate.Date;
            var guard = 0;
            while (run <= monthEnd && guard++ < 62) // günlük kural için bile ay sonuna yeter; sonsuz döngü emniyeti
            {
                if (rule.EndDate is DateTime end && run > end) break;
                if (run > today)
                {
                    var amount = AmountFor(rule, run);
                    dto.Items.Add(new Application.DTOs.Dashboard.CashflowItemDto
                    {
                        Date = run,
                        RuleId = rule.Id,
                        Description = rule.Description,
                        Type = rule.Type,
                        Amount = amount,
                        Currency = rule.Currency,
                    });
                    if (rule.Type == TransactionType.Income) dto.PlannedIncome += amount;
                    else dto.PlannedExpense += amount;
                }
                run = ComputeNextRunDate(run, rule.Frequency).Date;
            }
        }

        dto.Items = dto.Items.OrderBy(i => i.Date).ThenByDescending(i => i.Amount).ToList();
        dto.ProjectedNet = dto.ActualNet + dto.PlannedIncome - dto.PlannedExpense;

        return ApiResponse<Application.DTOs.Dashboard.CashflowForecastDto>.Success(dto);
    }

    /// <summary>
    /// Kuralın verilen koşu tarihindeki işlem tutarı: maaş otomatiği resmi kümülatif net,
    /// taksit son-ay küsuratı, diğerleri sabit Amount. RunDueAsync ve forecast aynı
    /// helper'ı kullanır — yeni özel tutar tipi eklenirse TEK yer güncellenir.
    /// </summary>
    private decimal AmountFor(RecurringRule rule, DateTime run) =>
        rule.PayrollGrossMonthly.HasValue
            ? PayrollNetFor(rule, run)
            : rule.InstallmentCount.HasValue
                ? InstallmentAmountFor(rule, run)
                : rule.Amount;

    public async Task<ApiResponse<RecurringRuleDto>> GetByIdAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.RecurringRules.AsNoTracking().Include(x => x.Category)
                .FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.RecurringRules.AsNoTracking().Include(x => x.Category)
                .FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<RecurringRuleDto>.Fail("Tekrarlayan kural bulunamadı.", 404, errorCode: ErrorCodes.RecurringRuleNotFound);

        var dto = mapper.Map<RecurringRuleDto>(entity);
        if (entity.InstallmentCount != null)
            dto.PaidInstallments = await context.Transactions.AsNoTracking()
                .CountAsync(t => t.RecurringRuleId == entity.Id, cancellationToken);

        return ApiResponse<RecurringRuleDto>.Success(dto);
    }

    public async Task<ApiResponse<RecurringRuleDto>> CreateAsync(int userId, CreateRecurringRuleDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var targetHouseholdId = scope;
        if (dto.HouseholdId.HasValue)
        {
            var access = await HouseholdScope.CheckMemberAccessAsync(context, userId, dto.HouseholdId.Value, cancellationToken);

            if (access == HouseholdAccess.NotMember)
                return ApiResponse<RecurringRuleDto>.Fail("Bu aileye erişiminiz yok.", 403, errorCode: ErrorCodes.HouseholdAccessDenied);

            if (access == HouseholdAccess.PremiumRequired)
                return ApiResponse<RecurringRuleDto>.Fail("Bu özellik premium üyelik gerektirir.", 403, errorCode: ErrorCodes.PremiumRequired);
            targetHouseholdId = dto.HouseholdId;
        }

        // Kategori erişim kontrolü (aktif scope + sistem).
        var category = targetHouseholdId.HasValue
            ? await context.Categories.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == dto.CategoryId
                                       && (c.HouseholdId == targetHouseholdId.Value
                                           || (c.IsSystem && c.UserId == null)),
                                     cancellationToken)
            : await context.Categories.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == dto.CategoryId
                                       && (c.UserId == userId
                                           || (c.IsSystem && c.UserId == null)),
                                     cancellationToken);
        if (category is null)
            return ApiResponse<RecurringRuleDto>.Fail("Kategori bulunamadı.", 404, errorCode: ErrorCodes.CategoryNotFound);

        if (category.Type != dto.Type)
            return ApiResponse<RecurringRuleDto>.Fail("Kategori türü ile kural türü uyuşmuyor.", 400, errorCode: ErrorCodes.RuleCategoryTypeMismatch);

        // NextRunDate her zaman StartDate'tir. Geçmişte veya bugün ise
        // SaveChanges sonrası RunDueAsync ile hemen ilk transaction üretilir
        // (Hangfire daily cron'unu beklemeden).
        var nextRun = dto.StartDate;

        var entity = new RecurringRule
        {
            UserId = userId,
            HouseholdId = targetHouseholdId,
            CategoryId = category.Id,
            Description = dto.Description.Trim(),
            Type = dto.Type,
            Nature = dto.Nature,
            Amount = dto.Amount,
            Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "TRY" : dto.Currency.Trim().ToUpperInvariant(),
            Frequency = dto.Frequency,
            StartDate = dto.StartDate,
            // Taksit planı: EndDate = son taksit ayının GÜN SONU. Gün sonu şart — Hangfire 02:05'te
            // koşar; EndDate gün başı (00:00) olsaydı son taksit günü "EndDate >= now" filtresinden
            // düşer, son taksit hiç üretilmezdi.
            EndDate = dto.InstallmentCount is int n
                ? dto.StartDate.AddMonths(n - 1).Date.AddDays(1).AddTicks(-1)
                : dto.EndDate,
            NextRunDate = nextRun,
            AutoApprove = dto.AutoApprove,
            IsActive = true,
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            PayrollGrossMonthly = dto.PayrollGrossMonthly,
            PayrollGrossHistory = dto.PayrollGrossMonthly is decimal g0
                ? JsonSerializer.Serialize(new List<PayrollGrossEntry> { new(dto.StartDate.Year, dto.StartDate.Month, g0) }, PayrollJson)
                : null,
            InstallmentCount = dto.InstallmentCount,
            InstallmentTotalAmount = dto.InstallmentCount.HasValue
                ? dto.InstallmentTotalAmount ?? dto.Amount * dto.InstallmentCount.Value
                : null,
        };

        await context.RecurringRules.AddAsync(entity, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        // Immediate execute — eğer NextRunDate <= şimdi ise Hangfire'ı beklemeden
        // ilk transaction'ı (varsa serisini) yarat. Bildirim dispatcher tetiklenir.
        if (entity.IsActive && entity.NextRunDate <= DateTime.Now)
        {
            try
            {
                await RunDueAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                // RunDueAsync hatası Create'i bozmaz; user kuralı görür, ileride
                // Hangfire tekrar dener. Para üreten yol — sessiz kalmasın.
                logger.LogWarning(ex, "Immediate execute başarısız: rule {RuleId}. Hangfire yeniden deneyecek.", entity.Id);
            }
        }

        var created = await context.RecurringRules
            .AsNoTracking()
            .Include(x => x.Category)
            .FirstAsync(x => x.Id == entity.Id, cancellationToken);

        return ApiResponse<RecurringRuleDto>.Success(mapper.Map<RecurringRuleDto>(created), "Tekrarlayan kural eklendi.", 201);
    }

    /// <summary>
    /// Tek bir recurring rule için manuel "şimdi çalıştır". RunDueAsync mantığının
    /// alt kümesi — sadece bu rule için NextRunDate gelmiş periodları execute eder.
    /// </summary>
    public async Task<ApiResponse<int>> RunOnceAsync(int userId, int ruleId, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var rule = scope.HasValue
            ? await context.RecurringRules.Include(r => r.Category)
                .FirstOrDefaultAsync(r => r.Id == ruleId
                                       && r.IsActive
                                       && r.HouseholdId == scope.Value, cancellationToken)
            : await context.RecurringRules.Include(r => r.Category)
                .FirstOrDefaultAsync(r => r.Id == ruleId
                                       && r.IsActive
                                       && r.HouseholdId == null
                                       && r.UserId == userId, cancellationToken);

        if (rule is null)
            return ApiResponse<int>.Fail("Tekrarlayan kural bulunamadı.", 404, errorCode: ErrorCodes.RecurringRuleNotFound);

        // Sahiplik kuralı: kuralı yalnız oluşturan çalıştırır — aile kaydı olsa bile owner/admin değil.
        if (rule.UserId != userId)
            return ApiResponse<int>.Fail("Bu kuralı yalnız oluşturan çalıştırabilir.", 403, errorCode: ErrorCodes.OnlyOwnerRunsRule);

        if (rule.NextRunDate > DateTime.Now)
            return ApiResponse<int>.Fail("Bu kural henüz çalıştırma zamanı gelmedi.", 400, errorCode: ErrorCodes.RuleNotDue);

        // RunDueAsync'i çağır — sadece bu rule due olduğu için yakalanacak. Diğer
        // due rule'lar da çalışsa zarar yok (idempotency dedup'ları zaten halleder).
        await RunDueAsync(cancellationToken);

        return ApiResponse<int>.Success(1, "Kural çalıştırıldı.");
    }

    public async Task<ApiResponse<RecurringRuleDto>> UpdateAsync(int userId, int id, UpdateRecurringRuleDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.RecurringRules.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.RecurringRules.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<RecurringRuleDto>.Fail("Tekrarlayan kural bulunamadı.", 404, errorCode: ErrorCodes.RecurringRuleNotFound);

        // Sahiplik kuralı: her kaydı yalnız oluşturan düzenler — aile kaydı olsa bile owner/admin değil.
        if (entity.UserId != userId)
            return ApiResponse<RecurringRuleDto>.Fail("Bu kaydı yalnız oluşturan düzenleyebilir.", 403, errorCode: ErrorCodes.OnlyOwnerEdits);

        var category = scope.HasValue
            ? await context.Categories.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == dto.CategoryId
                                       && (c.HouseholdId == scope.Value
                                           || (c.IsSystem && c.UserId == null)),
                                     cancellationToken)
            : await context.Categories.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == dto.CategoryId
                                       && (c.UserId == userId
                                           || (c.IsSystem && c.UserId == null)),
                                     cancellationToken);
        if (category is null)
            return ApiResponse<RecurringRuleDto>.Fail("Kategori bulunamadı.", 404, errorCode: ErrorCodes.CategoryNotFound);

        if (category.Type != entity.Type)
            return ApiResponse<RecurringRuleDto>.Fail("Kategori türü ile kural türü uyuşmuyor.", 400, errorCode: ErrorCodes.RuleCategoryTypeMismatch);

        // Taksit planında tutar/sıklık/başlangıç kilitli: bunlar değişirse EndDate + geçmiş
        // backfill + son-taksit küsuratı zinciri bozulur. Sayı değişikliği = sil + yeniden oluştur.
        // (EndDate değişikliğine izin var → "kalanını kapat" bu yoldan çalışır.)
        if (entity.InstallmentCount.HasValue &&
            (dto.Frequency != entity.Frequency || dto.Amount != entity.Amount || dto.StartDate != entity.StartDate))
            return ApiResponse<RecurringRuleDto>.Fail("Taksit planının tutarı, sıklığı ve başlangıcı değiştirilemez; planı silip yeniden oluştur.", 400, errorCode: ErrorCodes.InstallmentRuleLocked);

        entity.CategoryId = category.Id;
        entity.Description = dto.Description.Trim();
        entity.Nature = dto.Nature;
        entity.Amount = dto.Amount;
        entity.Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "TRY" : dto.Currency.Trim().ToUpperInvariant();
        entity.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();

        // Frequency veya StartDate değişirse NextRunDate'i yeniden hesapla.
        var freqOrStartChanged = entity.Frequency != dto.Frequency || entity.StartDate != dto.StartDate;
        entity.Frequency = dto.Frequency;
        entity.StartDate = dto.StartDate;
        entity.EndDate = dto.EndDate;
        if (freqOrStartChanged)
        {
            entity.NextRunDate = dto.StartDate < DateTime.Now
                ? ComputeNextRunDate(DateTime.Now, dto.Frequency)
                : dto.StartDate;
        }

        entity.AutoApprove = dto.AutoApprove;
        entity.IsActive = dto.IsActive;

        await context.SaveChangesAsync(cancellationToken);

        var updated = await context.RecurringRules
            .AsNoTracking()
            .Include(x => x.Category)
            .FirstAsync(x => x.Id == entity.Id, cancellationToken);

        return ApiResponse<RecurringRuleDto>.Success(mapper.Map<RecurringRuleDto>(updated), "Tekrarlayan kural güncellendi.");
    }

    public async Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.RecurringRules.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.RecurringRules.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<string>.Fail("Tekrarlayan kural bulunamadı.", 404, errorCode: ErrorCodes.RecurringRuleNotFound);

        // Sahiplik kuralı: her kaydı yalnız oluşturan siler — aile kaydı olsa bile owner/admin değil.
        if (entity.UserId != userId)
            return ApiResponse<string>.Fail("Bu kaydı yalnız oluşturan silebilir.", 403, errorCode: ErrorCodes.OnlyOwnerDeletes);

        // Soft delete; geçmişte üretilen Transaction'lar kalır.
        context.RecurringRules.Remove(entity);
        await context.SaveChangesAsync(cancellationToken);

        return ApiResponse<string>.Success("", "Tekrarlayan kural silindi.");
    }

    public DateTime ComputeNextRunDate(DateTime from, RecurringFrequency frequency) => frequency switch
    {
        RecurringFrequency.Daily => from.AddDays(1),
        RecurringFrequency.Weekly => from.AddDays(7),
        RecurringFrequency.Monthly => from.AddMonths(1),
        RecurringFrequency.Yearly => from.AddYears(1),
        _ => from.AddDays(1),
    };

    private static readonly JsonSerializerOptions PayrollJson = new(JsonSerializerDefaults.Web);

    // Maaş geçmişi kaydı (zam) — JSON: { "year": 2026, "month": 7, "gross": 105000 }.
    private sealed record PayrollGrossEntry(int Year, int Month, decimal Gross);

    /// <summary>
    /// Maaş otomatiği: verilen tarihteki ay/yıl için resmi kümülatif net maaşı döndürür.
    /// Zam geçmişi varsa o yılın ay-bazlı brütleriyle (değişken) hesaplar; böylece zam sonrası
    /// aylar doğru vergi diliminde çıkar. Geçmiş yoksa GÜNCEL brütü sabit kabul eder (geri uyum).
    /// İlgili yıl parametresi yoksa en güncel desteklenen yıla düşülür (ör. 2027 → 2026).
    /// </summary>
    private decimal PayrollNetFor(RecurringRule rule, DateTime when)
    {
        var year = payroll.SupportedYears.Contains(when.Year) ? when.Year : payroll.SupportedYears.Max();
        var history = ParsePayrollHistory(rule.PayrollGrossHistory);

        var result = history.Count > 0
            ? payroll.ComputeYearVariable(BuildMonthlyGross(history, when.Year), year)
            : payroll.ComputeYear(rule.PayrollGrossMonthly ?? 0m, year);

        var month = result.Months.FirstOrDefault(m => m.Month == when.Month);
        return month?.Net ?? rule.PayrollGrossMonthly ?? 0m;
    }

    /// <summary>
    /// Taksit planında ilgili çalışmanın tutarı. Son ay = Toplam − Aylık×(N−1): eşit bölme
    /// küsuratı (10.000/3 → 3.333,33+3.333,33+3.333,34) son taksitte kapanır. AddMonths ay
    /// sonuna clamp etse de (31 Oca → 28 Şub) yıl+ay her zaman EndDate'le örtüşür; gün
    /// karşılaştırması yerine yıl+ay eşitliği kullanılır.
    /// </summary>
    private static decimal InstallmentAmountFor(RecurringRule rule, DateTime run)
    {
        if (rule.EndDate is not DateTime end || rule.InstallmentCount is not int count) return rule.Amount;
        if (run.Year != end.Year || run.Month != end.Month) return rule.Amount;
        var residual = (rule.InstallmentTotalAmount ?? rule.Amount * count) - rule.Amount * (count - 1);
        return residual > 0m ? residual : rule.Amount; // defansif: bozuk veri tutarı sıfırlamasın
    }

    private static List<PayrollGrossEntry> ParsePayrollHistory(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<PayrollGrossEntry>>(json, PayrollJson) ?? []; }
        catch { return []; }
    }

    // Bir takvim yılı için 12 aylık brüt dizisi: her ay, o ay/yıl için yürürlükteki (≤) en güncel
    // kayıt; ilk kayıttan önceki aylar için ilk kaydın brütü (otomatik öncesi aynı maaş varsayımı —
    // kümülatif matrah tahmini). Böylece zam yürürlük ayından itibaren geçerli olur.
    private static decimal[] BuildMonthlyGross(List<PayrollGrossEntry> history, int calYear)
    {
        var ordered = history.OrderBy(h => h.Year).ThenBy(h => h.Month).ToList();
        var arr = new decimal[12];
        for (int m = 1; m <= 12; m++)
        {
            decimal? g = null;
            foreach (var e in ordered)
            {
                if (e.Year < calYear || (e.Year == calYear && e.Month <= m)) g = e.Gross;
                else break;
            }
            arr[m - 1] = g ?? ordered[0].Gross;
        }
        return arr;
    }

    /// <summary>
    /// Maaş otomatiğine zam uygular: yürürlük ay/yılı için yeni brütü geçmişe ekler (aynı ay varsa
    /// üzerine yazar), güncel brütü ve nominal tutarı tazeler. Yürürlük ayından itibaren üretilecek
    /// işlemler yeni brütten (doğru kümülatifle) hesaplanır.
    /// </summary>
    public async Task<ApiResponse<RecurringRuleDto>> ApplyPayrollRaiseAsync(int userId, int ruleId, decimal gross, DateTime effectiveDate, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var rule = scope.HasValue
            ? await context.RecurringRules.FirstOrDefaultAsync(r => r.Id == ruleId && r.HouseholdId == scope.Value, cancellationToken)
            : await context.RecurringRules.FirstOrDefaultAsync(r => r.Id == ruleId && r.HouseholdId == null && r.UserId == userId, cancellationToken);

        if (rule is null)
            return ApiResponse<RecurringRuleDto>.Fail("Tekrarlayan kural bulunamadı.", 404, errorCode: ErrorCodes.RecurringRuleNotFound);
        if (rule.UserId != userId)
            return ApiResponse<RecurringRuleDto>.Fail("Bu kaydı yalnız oluşturan düzenleyebilir.", 403, errorCode: ErrorCodes.OnlyOwnerEdits);
        if (rule.PayrollGrossMonthly is null)
            return ApiResponse<RecurringRuleDto>.Fail("Bu kural bir maaş otomatiği değil.", 400);

        var history = ParsePayrollHistory(rule.PayrollGrossHistory);
        if (history.Count == 0 && rule.PayrollGrossMonthly is decimal cur)
            history.Add(new PayrollGrossEntry(rule.StartDate.Year, rule.StartDate.Month, cur));
        history.RemoveAll(h => h.Year == effectiveDate.Year && h.Month == effectiveDate.Month);
        history.Add(new PayrollGrossEntry(effectiveDate.Year, effectiveDate.Month, gross));
        var ordered = history.OrderBy(h => h.Year).ThenBy(h => h.Month).ToList();

        rule.PayrollGrossHistory = JsonSerializer.Serialize(ordered, PayrollJson);
        rule.PayrollGrossMonthly = ordered[^1].Gross;
        rule.Amount = PayrollNetFor(rule, DateTime.Now);

        await context.SaveChangesAsync(cancellationToken);

        var updated = await context.RecurringRules.AsNoTracking().Include(x => x.Category).FirstAsync(x => x.Id == rule.Id, cancellationToken);
        return ApiResponse<RecurringRuleDto>.Success(mapper.Map<RecurringRuleDto>(updated), "Maaş güncellendi.");
    }

    public async Task<(int RulesProcessed, int TransactionsCreated)> RunDueAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.Now;

        // Vadesi gelmiş aktif kurallar. EndDate geçmiş olsa bile NextRunDate <= EndDate ise
        // üretilmemiş periyotlar var demektir (ör. tamamı geçmişte kalan taksit planı backfill'i
        // veya uzun downtime'da biten kuralın kuyruğu) — onları da işle; while döngüsü EndDate'te
        // durur ve NextRunDate EndDate'i aşınca kural bir daha seçilmez.
        var dueRules = await context.RecurringRules
            .Where(r => r.IsActive
                     && r.NextRunDate <= now
                     && (r.EndDate == null || r.EndDate >= now || r.NextRunDate <= r.EndDate))
            .ToListAsync(cancellationToken);

        // Çift taraflı premium: aile-scope'lu kural, sahibinin premium'u bittiyse askıya alınır —
        // üretim yapılmaz, NextRunDate İLERLETİLMEZ (premium dönünce while döngüsü kaçan
        // periyotları backfill eder; downtime telafisiyle aynı semantik). Kişisel kurallar muaf.
        var householdRuleOwnerIds = dueRules
            .Where(r => r.HouseholdId != null)
            .Select(r => r.UserId)
            .Distinct()
            .ToList();
        if (householdRuleOwnerIds.Count > 0)
        {
            var premiumOwners = new HashSet<int>();
            foreach (var ownerId in householdRuleOwnerIds)
                if (await HouseholdScope.IsPremiumAsync(context, ownerId, cancellationToken))
                    premiumOwners.Add(ownerId);

            var suspended = dueRules.RemoveAll(r => r.HouseholdId != null && !premiumOwners.Contains(r.UserId));
            if (suspended > 0)
                logger.LogInformation("RunDue: {Count} household rule(s) suspended (owner premium expired).", suspended);
        }

        if (dueRules.Count == 0)
            return (0, 0);

        var created = 0;
        var failed = 0;

        foreach (var rule in dueRules)
        {
            try
            {
            // Bir kural birden fazla periyot kaçırmış olabilir (ör. uygulama 5 gün down kaldı).
            // Her kaçırılan periyot için ayrı Transaction üret. Unique index (RuleId, TxDate)
            // bizi duplicate üretimden korur. Rule başına tek SaveChanges (batch) — kaçırılan
            // 5-10 periyot durumunda N round-trip yerine 1.
            var run = rule.NextRunDate;
            var safetyCounter = 0;
            var pending = new List<Transaction>();

            while (run <= now && (rule.EndDate == null || run <= rule.EndDate) && safetyCounter < 366)
            {
                var status = rule.AutoApprove ? TransactionStatus.Completed : TransactionStatus.Planned;
                // Maaş otomatiği: sabit Amount yerine ilgili ay/yılın resmi kümülatif netini üret.
                // Taksit planı: son ayda eşit bölme küsuratı kapanır (Toplam − Aylık×(N−1)).
                var amount = AmountFor(rule, run);
                pending.Add(new Transaction
                {
                    UserId = rule.UserId,
                    HouseholdId = rule.HouseholdId,
                    CategoryId = rule.CategoryId,
                    Type = rule.Type,
                    Nature = rule.Nature,
                    Status = status,
                    Source = TransactionSource.Recurring,
                    Amount = amount,
                    Currency = rule.Currency,
                    TransactionDate = run,
                    Notes = rule.Description,
                    RecurringRuleId = rule.Id,
                });

                run = ComputeNextRunDate(run, rule.Frequency);
                safetyCounter++;
            }

            var persisted = new List<Transaction>();
            if (pending.Count > 0)
            {
                await context.Transactions.AddRangeAsync(pending, cancellationToken);
                try
                {
                    await context.SaveChangesAsync(cancellationToken);
                    persisted.AddRange(pending);
                    created += pending.Count;
                }
                catch (DbUpdateException ex) when (IsUniqueViolation(ex))
                {
                    // Batch'te en az bir tx (RuleId, TxDate) çakıştı; PostgreSQL atomic insert
                    // nedeniyle tümü rollback oldu. Per-tx fallback ile sağlamlarını yaz, dup'ları atla.
                    logger.LogDebug(ex, "Recurring batch çakıştı, per-tx fallback: rule {RuleId} batch {Count}", rule.Id, pending.Count);
                    context.ChangeTracker.Clear();
                    foreach (var tx in pending)
                    {
                        try
                        {
                            await context.Transactions.AddAsync(tx, cancellationToken);
                            await context.SaveChangesAsync(cancellationToken);
                            persisted.Add(tx);
                            created++;
                        }
                        catch (DbUpdateException dupEx) when (IsUniqueViolation(dupEx))
                        {
                            context.Entry(tx).State = EntityState.Detached;
                        }
                    }
                }
            }

            foreach (var tx in persisted)
            {
                var payload = JsonSerializer.Serialize(new
                {
                    ruleName = rule.Description,
                    amount = tx.Amount,
                    transactionId = tx.Id,
                });

                var envelope = new NotificationEnvelope(
                    UserId: rule.UserId,
                    Type: NotificationType.RecurringExecuted,
                    Severity: NotificationSeverity.Info,
                    TitleKey: "notif_recurring_executed_title",
                    MessageKey: "notif_recurring_executed_body",
                    Payload: payload,
                    RefType: "recurring",
                    RefId: rule.Id,
                    DedupKey: $"recurring:{rule.Id}:{tx.TransactionDate:yyyy-MM-dd}",
                    PushTitle: "Otomatik kayıt",
                    PushBody: $"{rule.Description}: {tx.Amount:N2} {rule.Currency}");

                await dispatcher.DispatchAsync(envelope, cancellationToken);
            }

            rule.NextRunDate = run;

            // Auto-mod borç bağlantısı: bu kurala bağlı aktif bir borç varsa, üretilen taksit
            // işlemlerini borca ödeme olarak işle (kalanı düş, son taksitte tam kapat, bitince
            // Completed). İdempotent + kendini-iyileştirir; bir run hata alsa sonraki run düzeltir.
            await SyncLinkedDebtAsync(rule, cancellationToken);
            }
            catch (Exception ex)
            {
                // Bir kural patlasa diğerlerini engellememek için per-rule try/catch.
                // Rule.NextRunDate güncellenmemiş kalır → bir sonraki run'da yine denenecek.
                // Unique index (RuleId, TxDate) sayesinde kısmi yazılmış kayıtlar duplicate yaratmaz.
                failed++;
                logger.LogError(ex, "Recurring rule {RuleId} işlenemedi (user {UserId}); diğer kurallar devam ediyor.", rule.Id, rule.UserId);
                context.ChangeTracker.Clear();
            }
        }

        await context.SaveChangesAsync(cancellationToken);
        if (failed > 0)
            logger.LogWarning("Recurring batch tamamlandı: {Processed} işlendi, {Created} tx oluştu, {Failed} kural hatasıyla atlandı.", dueRules.Count, created, failed);
        return (dueRules.Count, created);
    }

    /// <summary>
    /// Public reconcile — DebtService auto borç link'ledikten sonra çağırır. Kuralı yükler,
    /// debt senkronunu çalıştırır ve kaydeder. (Immediate-execute taksitlerini geç de olsa
    /// borca işler.)
    /// </summary>
    public async Task ReconcileLinkedDebtAsync(int ruleId, CancellationToken cancellationToken = default)
    {
        var rule = await context.RecurringRules
            .FirstOrDefaultAsync(r => r.Id == ruleId, cancellationToken);
        if (rule is null)
            return;

        await SyncLinkedDebtAsync(rule, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Auto-mod borç senkronu: bir RecurringRule'a bağlı borcun, henüz ödemeye bağlanmamış
    /// taksit işlemlerini DebtPayment olarak kaydeder, RemainingAmount'u düşürür ve borç
    /// tamamen ödenince Completed yapar. TransactionId ile dedup edildiği için idempotenttir;
    /// son planlı taksit kalanın tamamını ödeyerek eşit-bölme yuvarlama artığını kapatır.
    /// </summary>
    private async Task SyncLinkedDebtAsync(RecurringRule rule, CancellationToken cancellationToken)
    {
        var debt = await context.Debts
            .FirstOrDefaultAsync(d => d.LinkedRecurringRuleId == rule.Id, cancellationToken);
        if (debt is null || debt.Status != DebtStatus.Active || debt.RemainingAmount <= 0m)
            return;

        // Bu kuralın, henüz bir DebtPayment'e bağlanmamış taksit işlemleri (TransactionId ile dedup).
        var unpaidTxs = await context.Transactions
            .Where(t => t.RecurringRuleId == rule.Id
                     && !context.DebtPayments.Any(p => p.TransactionId == t.Id))
            .OrderBy(t => t.TransactionDate)
            .ToListAsync(cancellationToken);
        if (unpaidTxs.Count == 0)
            return;

        // Kaçıncı taksitte olduğumuzu YALNIZ bu kuralın işlemlerinden say (manuel ödemeler etkilemesin).
        var generatedCount = await context.Transactions
            .CountAsync(t => t.RecurringRuleId == rule.Id, cancellationToken);
        var totalInstallments = debt.InstallmentCount ?? generatedCount;
        var idx = generatedCount - unpaidTxs.Count; // bu kuralca zaten ödenmiş taksit sayısı

        foreach (var tx in unpaidTxs)
        {
            if (debt.RemainingAmount <= 0m)
                break;
            idx++;
            // Son planlı taksit kalanın tamamını öder → eşit-bölme yuvarlama artığı kapanır.
            var isFinal = idx >= totalInstallments;
            var pay = isFinal ? debt.RemainingAmount : Math.Min(tx.Amount, debt.RemainingAmount);

            context.DebtPayments.Add(new DebtPayment
            {
                DebtId = debt.Id,
                Amount = pay,
                PaymentDate = tx.TransactionDate,
                Notes = "Otomatik taksit",
                TransactionId = tx.Id,
            });
            debt.RemainingAmount -= pay;
        }

        if (debt.RemainingAmount <= 0m)
        {
            debt.RemainingAmount = 0m;
            debt.Status = DebtStatus.Completed;
            debt.NextDueDate = null;
        }
        else
        {
            debt.NextDueDate = rule.NextRunDate;
        }
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
    {
        // PostgreSQL SQLState 23505 = unique_violation. Strongly-typed; önceki reflection
        // tabanlı kontrol Npgsql tip ismi değişirse sessizce kırılırdı.
        return ex.InnerException is PostgresException pg && pg.SqlState == "23505";
    }
}
