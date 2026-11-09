using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ParaRota.Application.DTOs.Transactions;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class TransactionService(
    AppDbContext context,
    IMapper mapper,
    IBudgetService budgetService,
    ICurrentUserService currentUser) : ITransactionService
{
    public async Task<ApiResponse<PagedResponse<TransactionDto>>> GetAllAsync(int userId, TransactionListParams query, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var baseQuery = context.Transactions
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.User);

        var q = scope.HasValue
            ? baseQuery.Where(x => x.HouseholdId == scope.Value)
            : baseQuery.Where(x => x.HouseholdId == null && x.UserId == userId);

        if (query.Type.HasValue) q = q.Where(x => x.Type == query.Type.Value);
        if (query.Nature.HasValue) q = q.Where(x => x.Nature == query.Nature.Value);
        if (query.Status.HasValue) q = q.Where(x => x.Status == query.Status.Value);
        if (query.CategoryId.HasValue) q = q.Where(x => x.CategoryId == query.CategoryId.Value);

        if (query.Month.HasValue && query.Year.HasValue)
        {
            q = q.Where(x => x.TransactionDate.Year == query.Year.Value
                          && x.TransactionDate.Month == query.Month.Value);
        }
        else if (query.Year.HasValue)
        {
            q = q.Where(x => x.TransactionDate.Year == query.Year.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var search = query.Q.Trim().ToLower();
            q = q.Where(x =>
                (x.Notes != null && x.Notes.ToLower().Contains(search))
                || x.Category.Name.ToLower().Contains(search));
        }

        var total = await q.CountAsync(cancellationToken);

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 200);

        var items = await q
            .OrderByDescending(x => x.TransactionDate)
            .ThenByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var dtos = mapper.Map<List<TransactionDto>>(items);

        var paged = new PagedResponse<TransactionDto>
        {
            Items = dtos,
            PageNumber = page,
            PageSize = pageSize,
            TotalCount = total,
        };

        return ApiResponse<PagedResponse<TransactionDto>>.Success(paged);
    }

    public async Task<ApiResponse<TransactionDto>> GetByIdAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Transactions.AsNoTracking().Include(x => x.Category).Include(x => x.User)
                .FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.Transactions.AsNoTracking().Include(x => x.Category).Include(x => x.User)
                .FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<TransactionDto>.Fail("Hareket bulunamadı.", 404, errorCode: ErrorCodes.TransactionNotFound);

        return ApiResponse<TransactionDto>.Success(mapper.Map<TransactionDto>(entity));
    }

    public async Task<ApiResponse<TransactionDto>> CreateAsync(int userId, CreateTransactionDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        // DTO'da gelen HouseholdId aktif scope ile uyumlu olmalı; uyumsuzsa scope'a göre normalize et.
        var targetHouseholdId = scope;
        if (dto.HouseholdId.HasValue)
        {
            var access = await HouseholdScope.CheckMemberAccessAsync(context, userId, dto.HouseholdId.Value, cancellationToken);

            if (access == HouseholdAccess.NotMember)
                return ApiResponse<TransactionDto>.Fail("Bu aileye erişiminiz yok.", 403, errorCode: ErrorCodes.HouseholdAccessDenied);

            if (access == HouseholdAccess.PremiumRequired)
                return ApiResponse<TransactionDto>.Fail("Bu özellik premium üyelik gerektirir.", 403, errorCode: ErrorCodes.PremiumRequired);
            targetHouseholdId = dto.HouseholdId;
        }

        // Kategori erişimi aktif scope ile sınırlı: kişisel scope'ta sadece kullanıcı/sistem kategorileri,
        // household scope'ta sadece o household'ın veya sistem kategorileri.
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
            return ApiResponse<TransactionDto>.Fail("Kategori bulunamadı.", 404, errorCode: ErrorCodes.CategoryNotFound);

        if (category.Type != dto.Type)
            return ApiResponse<TransactionDto>.Fail("Kategori türü ile hareket türü uyuşmuyor.", 400, errorCode: ErrorCodes.TxCategoryTypeMismatch);

        var entity = new Transaction
        {
            UserId = userId,
            HouseholdId = targetHouseholdId,
            CategoryId = category.Id,
            Type = dto.Type,
            Nature = dto.Nature,
            Status = dto.Status,
            Amount = dto.Amount,
            Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "TRY" : dto.Currency.Trim().ToUpperInvariant(),
            PaidVia = dto.PaidVia,
            TransactionDate = dto.TransactionDate,
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            ReceiptUrl = string.IsNullOrWhiteSpace(dto.ReceiptUrl) ? null : dto.ReceiptUrl.Trim(),
        };

        await context.Transactions.AddAsync(entity, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        // Budget alert değerlendirmesi — yeni harcama sonrası kategorideki bütçe uyarısı tetiklenebilir.
        if (entity.Type == TransactionType.Expense)
        {
            await budgetService.EvaluateAlertsForCategoryAsync(
                userId,
                entity.CategoryId,
                entity.TransactionDate.Month,
                entity.TransactionDate.Year,
                cancellationToken);
        }

        var created = await context.Transactions
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.User)
            .FirstAsync(x => x.Id == entity.Id, cancellationToken);

        return ApiResponse<TransactionDto>.Success(mapper.Map<TransactionDto>(created), "Hareket eklendi.", 201);
    }

    public async Task<ApiResponse<TransactionDto>> UpdateAsync(int userId, int id, UpdateTransactionDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Transactions.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.Transactions.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<TransactionDto>.Fail("Hareket bulunamadı.", 404, errorCode: ErrorCodes.TransactionNotFound);

        // Sahiplik kuralı: her kaydı yalnız oluşturan düzenler — aile kaydı olsa bile owner/admin değil.
        if (entity.UserId != userId)
            return ApiResponse<TransactionDto>.Fail("Bu kaydı yalnız oluşturan düzenleyebilir.", 403, errorCode: ErrorCodes.OnlyOwnerEdits);

        // Kategori değişebilir ama yine aktif scope'a uyumlu olmalı + aynı türde olmalı.
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
            return ApiResponse<TransactionDto>.Fail("Kategori bulunamadı.", 404, errorCode: ErrorCodes.CategoryNotFound);

        if (category.Type != entity.Type)
            return ApiResponse<TransactionDto>.Fail("Kategori türü ile hareket türü uyuşmuyor.", 400, errorCode: ErrorCodes.TxCategoryTypeMismatch);

        // Re-eval için eski (kategori, ay, yıl) snapshot'ı sakla.
        var oldCategoryId = entity.CategoryId;
        var oldMonth = entity.TransactionDate.Month;
        var oldYear = entity.TransactionDate.Year;
        var oldType = entity.Type;

        entity.CategoryId = category.Id;
        entity.Nature = dto.Nature;
        entity.Status = dto.Status;
        entity.Amount = dto.Amount;
        entity.Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "TRY" : dto.Currency.Trim().ToUpperInvariant();
        entity.PaidVia = dto.PaidVia;
        entity.TransactionDate = dto.TransactionDate;
        entity.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();
        entity.ReceiptUrl = string.IsNullOrWhiteSpace(dto.ReceiptUrl) ? null : dto.ReceiptUrl.Trim();

        await context.SaveChangesAsync(cancellationToken);

        // Eski ve yeni kategori/dönem için budget alert değerlendir.
        if (oldType == TransactionType.Expense)
        {
            await budgetService.EvaluateAlertsForCategoryAsync(userId, oldCategoryId, oldMonth, oldYear, cancellationToken);

            var newMonth = entity.TransactionDate.Month;
            var newYear = entity.TransactionDate.Year;
            if (oldCategoryId != entity.CategoryId || oldMonth != newMonth || oldYear != newYear)
            {
                await budgetService.EvaluateAlertsForCategoryAsync(userId, entity.CategoryId, newMonth, newYear, cancellationToken);
            }
        }

        var updated = await context.Transactions
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.User)
            .FirstAsync(x => x.Id == entity.Id, cancellationToken);

        return ApiResponse<TransactionDto>.Success(mapper.Map<TransactionDto>(updated), "Hareket güncellendi.");
    }

    public async Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Transactions.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.Transactions.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<string>.Fail("Hareket bulunamadı.", 404, errorCode: ErrorCodes.TransactionNotFound);

        // Sahiplik kuralı: her kaydı yalnız oluşturan siler — aile kaydı olsa bile owner/admin değil.
        if (entity.UserId != userId)
            return ApiResponse<string>.Fail("Bu kaydı yalnız oluşturan silebilir.", 403, errorCode: ErrorCodes.OnlyOwnerDeletes);

        var categoryId = entity.CategoryId;
        var month = entity.TransactionDate.Month;
        var year = entity.TransactionDate.Year;
        var wasExpense = entity.Type == TransactionType.Expense;

        // Soft delete.
        context.Transactions.Remove(entity);
        await context.SaveChangesAsync(cancellationToken);

        if (wasExpense)
        {
            await budgetService.EvaluateAlertsForCategoryAsync(userId, categoryId, month, year, cancellationToken);
        }

        return ApiResponse<string>.Success("", "Hareket silindi.");
    }

    public async Task<ApiResponse<TransactionDto>> MoveScopeAsync(int userId, int id, MoveTransactionScopeDto dto, CancellationToken cancellationToken = default)
    {
        // Kaydı sahibi üzerinden bul — aktif scope'tan bağımsız, sahibi her zaman taşıyabilir.
        var entity = await context.Transactions
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<TransactionDto>.Fail("Hareket bulunamadı.", 404, errorCode: ErrorCodes.TransactionNotFound);

        // Hedef scope: null = kişisel, dolu = aile (kullanıcı üye olmalı).
        var target = dto.TargetHouseholdId;
        if (target.HasValue)
        {
            var access = await HouseholdScope.CheckMemberAccessAsync(context, userId, target.Value, cancellationToken);

            if (access == HouseholdAccess.NotMember)
                return ApiResponse<TransactionDto>.Fail("Bu aileye erişiminiz yok.", 403, errorCode: ErrorCodes.HouseholdAccessDenied);

            if (access == HouseholdAccess.PremiumRequired)
                return ApiResponse<TransactionDto>.Fail("Bu özellik premium üyelik gerektirir.", 403, errorCode: ErrorCodes.PremiumRequired);
        }

        if (target == entity.HouseholdId)
            return ApiResponse<TransactionDto>.Fail("Hareket zaten bu kapsamda.", 400, errorCode: ErrorCodes.TransactionAlreadyInScope);

        // Hedef kategori, hedef scope'ta erişilebilir olmalı (sistem kategori her iki scope'ta geçerli).
        var category = target.HasValue
            ? await context.Categories.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == dto.CategoryId
                                       && (c.HouseholdId == target.Value || (c.IsSystem && c.UserId == null)),
                                     cancellationToken)
            : await context.Categories.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == dto.CategoryId
                                       && (c.UserId == userId || (c.IsSystem && c.UserId == null)),
                                     cancellationToken);
        if (category is null)
            return ApiResponse<TransactionDto>.Fail("Kategori bulunamadı.", 404, errorCode: ErrorCodes.CategoryNotFound);
        if (category.Type != entity.Type)
            return ApiResponse<TransactionDto>.Fail("Kategori türü ile hareket türü uyuşmuyor.", 400, errorCode: ErrorCodes.TxCategoryTypeMismatch);

        var oldCategoryId = entity.CategoryId;
        var oldHousehold = entity.HouseholdId;
        entity.HouseholdId = target;
        entity.CategoryId = category.Id;
        await context.SaveChangesAsync(cancellationToken);

        // Budget alert: kayıt eski scope'tan çıktı, yeni (target) scope'a girdi — her birini KENDİ
        // scope'unda değerlendir (aktif HTTP header scope'u taşıma hedefinden farklı olabilir).
        if (entity.Type == TransactionType.Expense)
        {
            await budgetService.EvaluateAlertsInScopeAsync(userId, oldHousehold, oldCategoryId, entity.TransactionDate.Month, entity.TransactionDate.Year, cancellationToken);
            await budgetService.EvaluateAlertsInScopeAsync(userId, target, entity.CategoryId, entity.TransactionDate.Month, entity.TransactionDate.Year, cancellationToken);
        }

        var moved = await context.Transactions
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.User)
            .FirstAsync(x => x.Id == entity.Id, cancellationToken);

        return ApiResponse<TransactionDto>.Success(mapper.Map<TransactionDto>(moved), "Hareket taşındı.");
    }
}
