using System.Text.Json;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ParaRota.Application.DTOs.Budgets;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class BudgetService(
    AppDbContext context,
    IMapper mapper,
    INotificationDispatcher dispatcher,
    ICurrentUserService currentUser) : IBudgetService
{
    public async Task<ApiResponse<IReadOnlyList<BudgetDto>>> GetAllAsync(int userId, int? month, int? year, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var q = scope.HasValue
            ? context.Budgets.AsNoTracking().Include(x => x.Category)
                .Where(x => x.HouseholdId == scope.Value)
            : context.Budgets.AsNoTracking().Include(x => x.Category)
                .Where(x => x.HouseholdId == null && x.UserId == userId);

        if (month.HasValue) q = q.Where(x => x.Month == month.Value);
        if (year.HasValue) q = q.Where(x => x.Year == year.Value);

        // Memory safety: paginated DTO eklenene kadar 500'lük üst sınır.
        var items = await q
            .OrderByDescending(x => x.Year)
            .ThenByDescending(x => x.Month)
            .ThenBy(x => x.Category.Name)
            .Take(500)
            .ToListAsync(cancellationToken);

        var dtos = await BuildDtosWithStatusAsync(items, userId, scope, cancellationToken);
        return ApiResponse<IReadOnlyList<BudgetDto>>.Success(dtos);
    }

    public async Task<ApiResponse<BudgetDto>> GetByIdAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Budgets.AsNoTracking().Include(x => x.Category)
                .FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.Budgets.AsNoTracking().Include(x => x.Category)
                .FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<BudgetDto>.Fail("Bütçe bulunamadı.", 404, errorCode: ErrorCodes.BudgetNotFound);

        var dtos = await BuildDtosWithStatusAsync(new List<Budget> { entity }, userId, scope, cancellationToken);
        return ApiResponse<BudgetDto>.Success(dtos[0]);
    }

    public async Task<ApiResponse<BudgetDto>> CreateAsync(int userId, CreateBudgetDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var targetHouseholdId = scope;
        if (dto.HouseholdId.HasValue)
        {
            var access = await HouseholdScope.CheckMemberAccessAsync(context, userId, dto.HouseholdId.Value, cancellationToken);

            if (access == HouseholdAccess.NotMember)
                return ApiResponse<BudgetDto>.Fail("Bu aileye erişiminiz yok.", 403, errorCode: ErrorCodes.HouseholdAccessDenied);

            if (access == HouseholdAccess.PremiumRequired)
                return ApiResponse<BudgetDto>.Fail("Bu özellik premium üyelik gerektirir.", 403, errorCode: ErrorCodes.PremiumRequired);
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
            return ApiResponse<BudgetDto>.Fail("Kategori bulunamadı.", 404, errorCode: ErrorCodes.CategoryNotFound);

        if (category.Type != TransactionType.Expense)
            return ApiResponse<BudgetDto>.Fail("Bütçe sadece gider kategorilerine konulabilir.", 400, errorCode: ErrorCodes.BudgetExpenseOnly);

        // Aynı (scope, cat, month, year) için duplicate check.
        var duplicate = targetHouseholdId.HasValue
            ? await context.Budgets.AnyAsync(b => b.HouseholdId == targetHouseholdId.Value
                                                && b.CategoryId == dto.CategoryId
                                                && b.Month == dto.Month
                                                && b.Year == dto.Year, cancellationToken)
            : await context.Budgets.AnyAsync(b => b.HouseholdId == null
                                                && b.UserId == userId
                                                && b.CategoryId == dto.CategoryId
                                                && b.Month == dto.Month
                                                && b.Year == dto.Year, cancellationToken);
        if (duplicate)
            return ApiResponse<BudgetDto>.Fail("Bu ay bu kategoriye zaten bir bütçe var.", 409, errorCode: ErrorCodes.BudgetDuplicateMonth);

        var entity = new Budget
        {
            UserId = userId,
            HouseholdId = targetHouseholdId,
            CategoryId = category.Id,
            MonthlyLimit = dto.MonthlyLimit,
            Month = dto.Month,
            Year = dto.Year,
            WarnThreshold = dto.WarnThreshold,
        };

        await context.Budgets.AddAsync(entity, cancellationToken);
        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException pg && pg.SqlState == "23505")
        {
            // Unique index ihlali (yarış durumu veya AnyAsync'in göremediği partial-index sınırı) → 500 yerine 409.
            return ApiResponse<BudgetDto>.Fail("Bu ay bu kategoriye zaten bir bütçe var.", 409, errorCode: ErrorCodes.BudgetDuplicateMonth);
        }

        var created = await context.Budgets
            .AsNoTracking()
            .Include(x => x.Category)
            .FirstAsync(x => x.Id == entity.Id, cancellationToken);

        var dtos = await BuildDtosWithStatusAsync(new List<Budget> { created }, userId, targetHouseholdId, cancellationToken);
        return ApiResponse<BudgetDto>.Success(dtos[0], "Bütçe eklendi.", 201);
    }

    public async Task<ApiResponse<BudgetDto>> UpdateAsync(int userId, int id, UpdateBudgetDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Budgets.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.Budgets.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<BudgetDto>.Fail("Bütçe bulunamadı.", 404, errorCode: ErrorCodes.BudgetNotFound);

        // Sahiplik kuralı: her kaydı yalnız oluşturan düzenler — aile kaydı olsa bile owner/admin değil.
        if (entity.UserId != userId)
            return ApiResponse<BudgetDto>.Fail("Bu kaydı yalnız oluşturan düzenleyebilir.", 403, errorCode: ErrorCodes.OnlyOwnerEdits);

        entity.MonthlyLimit = dto.MonthlyLimit;
        entity.WarnThreshold = dto.WarnThreshold;

        await context.SaveChangesAsync(cancellationToken);

        var updated = await context.Budgets
            .AsNoTracking()
            .Include(x => x.Category)
            .FirstAsync(x => x.Id == entity.Id, cancellationToken);

        var dtos = await BuildDtosWithStatusAsync(new List<Budget> { updated }, userId, scope, cancellationToken);
        return ApiResponse<BudgetDto>.Success(dtos[0], "Bütçe güncellendi.");
    }

    public async Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Budgets.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.Budgets.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<string>.Fail("Bütçe bulunamadı.", 404, errorCode: ErrorCodes.BudgetNotFound);

        // Sahiplik kuralı: her kaydı yalnız oluşturan siler — aile kaydı olsa bile owner/admin değil.
        if (entity.UserId != userId)
            return ApiResponse<string>.Fail("Bu kaydı yalnız oluşturan silebilir.", 403, errorCode: ErrorCodes.OnlyOwnerDeletes);

        context.Budgets.Remove(entity);
        await context.SaveChangesAsync(cancellationToken);
        return ApiResponse<string>.Success("", "Bütçe silindi.");
    }

    public async Task<IReadOnlyList<BudgetDto>> GetStatusForDashboardAsync(int userId, int month, int year, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entities = scope.HasValue
            ? await context.Budgets.AsNoTracking().Include(x => x.Category)
                .Where(x => x.HouseholdId == scope.Value && x.Month == month && x.Year == year)
                .ToListAsync(cancellationToken)
            : await context.Budgets.AsNoTracking().Include(x => x.Category)
                .Where(x => x.HouseholdId == null && x.UserId == userId && x.Month == month && x.Year == year)
                .ToListAsync(cancellationToken);

        var dtos = await BuildDtosWithStatusAsync(entities, userId, scope, cancellationToken);
        return dtos
            .OrderByDescending(d => d.AlertLevel)
            .ThenByDescending(d => d.UsagePercentage)
            .ToList();
    }

    private async Task<IReadOnlyList<BudgetDto>> BuildDtosWithStatusAsync(
        IReadOnlyList<Budget> budgets,
        int userId,
        int? scope,
        CancellationToken cancellationToken)
    {
        if (budgets.Count == 0) return Array.Empty<BudgetDto>();

        var keys = budgets.Select(b => new { b.CategoryId, b.Month, b.Year }).ToList();
        var catIds = keys.Select(k => k.CategoryId).Distinct().ToList();
        var minYearMonth = keys.Min(k => k.Year * 100 + k.Month);
        var maxYearMonth = keys.Max(k => k.Year * 100 + k.Month);
        var minYear = minYearMonth / 100;
        var maxYear = maxYearMonth / 100;

        // Aktif scope'taki tüm transaction'lar. Aile scope = household-native; kişisel scope = sahibinin kişiselleri.
        var txBase = scope.HasValue
            ? context.Transactions.AsNoTracking().Where(x => x.HouseholdId == scope.Value)
            : context.Transactions.AsNoTracking().Where(x => x.HouseholdId == null && x.UserId == userId);

        // Bütçe tutarı scope'un para birimindedir — farklı birimli işlemler harcamaya
        // kur çevrimi olmadan eklenemez (100 USD ≠ 100 TRY).
        var reportingCurrency = await HouseholdScope.ResolveReportingCurrencyAsync(context, userId, scope, cancellationToken);
        txBase = txBase.Where(x => x.Currency == reportingCurrency);

        var spentRows = await txBase
            .Where(x => x.Type == TransactionType.Expense
                     && x.Status == TransactionStatus.Completed
                     && catIds.Contains(x.CategoryId)
                     && x.TransactionDate.Year >= minYear
                     && x.TransactionDate.Year <= maxYear)
            .GroupBy(x => new { x.CategoryId, x.TransactionDate.Year, x.TransactionDate.Month })
            .Select(g => new { g.Key.CategoryId, g.Key.Year, g.Key.Month, Total = g.Sum(x => x.Amount) })
            .ToListAsync(cancellationToken);

        // Aile scope'unda bütçe başına kişi kırılımı (kim ne kadar harcadı).
        var breakdownByKey = new Dictionary<(int CategoryId, int Year, int Month), List<BudgetMemberSpentDto>>();
        if (scope.HasValue)
        {
            var memberRows = await txBase
                .Where(x => x.Type == TransactionType.Expense
                         && x.Status == TransactionStatus.Completed
                         && catIds.Contains(x.CategoryId)
                         && x.TransactionDate.Year >= minYear
                         && x.TransactionDate.Year <= maxYear)
                .GroupBy(x => new { x.CategoryId, x.TransactionDate.Year, x.TransactionDate.Month, x.UserId })
                .Select(g => new { g.Key.CategoryId, g.Key.Year, g.Key.Month, g.Key.UserId, Total = g.Sum(x => x.Amount) })
                .ToListAsync(cancellationToken);

            var userIds = memberRows.Select(r => r.UserId).Distinct().ToList();
            // İsim birleştirme bellekte yapılır (EF'e Trim/concat SQL çevirtme riski yok).
            var userRows = await context.Users.AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FirstName, u.LastName })
                .ToListAsync(cancellationToken);
            var names = userRows.ToDictionary(
                u => u.Id,
                u => ((u.FirstName ?? string.Empty) + " " + (u.LastName ?? string.Empty)).Trim());

            breakdownByKey = memberRows
                .GroupBy(r => (r.CategoryId, r.Year, r.Month))
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(r => new BudgetMemberSpentDto
                    {
                        UserId = r.UserId,
                        Name = names.GetValueOrDefault(r.UserId, string.Empty),
                        Amount = r.Total,
                    }).OrderByDescending(m => m.Amount).ToList());
        }

        var dtos = new List<BudgetDto>(budgets.Count);
        foreach (var b in budgets)
        {
            var dto = mapper.Map<BudgetDto>(b);
            var spent = spentRows
                .FirstOrDefault(r => r.CategoryId == b.CategoryId && r.Year == b.Year && r.Month == b.Month)
                ?.Total ?? 0m;

            if (breakdownByKey.TryGetValue((b.CategoryId, b.Year, b.Month), out var breakdown))
                dto.MemberBreakdown = breakdown;

            dto.Spent = spent;
            dto.Remaining = b.MonthlyLimit - spent;
            dto.UsagePercentage = b.MonthlyLimit > 0 ? (double)(spent / b.MonthlyLimit) * 100 : 0;

            if (spent > b.MonthlyLimit)
                dto.AlertLevel = BudgetAlertLevel.Exceeded;
            else if (dto.UsagePercentage >= b.WarnThreshold)
                dto.AlertLevel = BudgetAlertLevel.Warning;
            else
                dto.AlertLevel = BudgetAlertLevel.Normal;

            dtos.Add(dto);
        }

        return dtos;
    }

    public async Task EvaluateAlertsForCategoryAsync(int userId, int categoryId, int month, int year, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);
        await EvaluateAlertsInScopeAsync(userId, scope, categoryId, month, year, cancellationToken);
    }

    // Belirli bir scope için (HTTP header'dan bağımsız) bütçe uyarısı değerlendir. MoveScope gibi
    // işlemin scope'unun aktif scope'tan farklı olabildiği durumlar bu overload'ı kullanır.
    public async Task EvaluateAlertsInScopeAsync(int userId, int? scope, int categoryId, int month, int year, CancellationToken cancellationToken = default)
    {
        var budget = scope.HasValue
            ? await context.Budgets.AsNoTracking().Include(x => x.Category)
                .FirstOrDefaultAsync(b => b.HouseholdId == scope.Value
                                       && b.CategoryId == categoryId
                                       && b.Month == month
                                       && b.Year == year, cancellationToken)
            : await context.Budgets.AsNoTracking().Include(x => x.Category)
                .FirstOrDefaultAsync(b => b.HouseholdId == null
                                       && b.UserId == userId
                                       && b.CategoryId == categoryId
                                       && b.Month == month
                                       && b.Year == year, cancellationToken);
        if (budget is null) return;

        var dtos = await BuildDtosWithStatusAsync(new List<Budget> { budget }, userId, scope, cancellationToken);
        var status = dtos[0];

        if (status.AlertLevel == BudgetAlertLevel.Normal) return;

        var categoryName = budget.Category?.Name ?? "Kategori";

        var isExceeded = status.AlertLevel == BudgetAlertLevel.Exceeded;
        var overBy = isExceeded ? Math.Max(0m, status.Spent - budget.MonthlyLimit) : 0m;

        var payload = JsonSerializer.Serialize(new
        {
            categoryName,
            usagePercentage = Math.Round(status.UsagePercentage, 2),
            limit = budget.MonthlyLimit,
            spent = status.Spent,
            overBy,
            month,
            year,
        });

        var dedup = isExceeded
            ? $"budget:{budget.Id}:Exceeded:{year}-{month:00}"
            : $"budget:{budget.Id}:Warning:{year}-{month:00}";

        var envelope = new NotificationEnvelope(
            UserId: userId,
            Type: isExceeded ? NotificationType.BudgetExceeded : NotificationType.BudgetWarning,
            Severity: isExceeded ? NotificationSeverity.Error : NotificationSeverity.Warning,
            TitleKey: isExceeded ? "notif_budget_exceeded_title" : "notif_budget_warning_title",
            MessageKey: isExceeded ? "notif_budget_exceeded_body" : "notif_budget_warning_body",
            Payload: payload,
            RefType: "budget",
            RefId: budget.Id,
            DedupKey: dedup,
            PushTitle: isExceeded ? "Bütçe aşıldı" : "Bütçe uyarısı",
            PushBody: isExceeded
                ? $"{categoryName} bütçesini {overBy:N2} ₺ aştın."
                : $"{categoryName} bütçesinin %{status.UsagePercentage:N0}'ı kullanıldı.");

        await dispatcher.DispatchAsync(envelope, cancellationToken);
    }
}
