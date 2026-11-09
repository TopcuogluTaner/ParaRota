using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ParaRota.Application.DTOs.Categories;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class CategoryService(AppDbContext context, IMapper mapper, ICurrentUserService currentUser) : ICategoryService
{
    // Sistem-default kategori seed verisi.
    private static readonly (string Name, string Icon, string Color, TransactionType Type)[] SeedDefaults =
    [
        ("Maaş",        "mdi:cash-multiple",         "#0F8B6C", TransactionType.Income),
        ("Bonus",       "mdi:gift-outline",          "#1FB585", TransactionType.Income),
        ("Kira",        "mdi:home-outline",          "#B0341E", TransactionType.Expense),
        ("Faturalar",   "mdi:lightning-bolt-outline","#B7651C", TransactionType.Expense),
        ("Market",      "mdi:cart-outline",          "#D58A36", TransactionType.Expense),
        ("Ulaşım",      "mdi:car-outline",           "#1E5F8A", TransactionType.Expense),
        ("Yeme-İçme",   "mdi:silverware-fork-knife", "#D8543B", TransactionType.Expense),
        ("Eğlence",     "mdi:movie-outline",         "#9C5A9C", TransactionType.Expense),
        ("Sağlık",      "mdi:heart-pulse",           "#0F8B6C", TransactionType.Expense),
        ("Abonelikler", "mdi:autorenew",             "#7B6CA5", TransactionType.Expense),
        ("Borç Ödeme",  "mdi:credit-card-outline",   "#5A4A3D", TransactionType.Expense),
        ("Yatırım",       "mdi:trending-up",         "#2E7D32", TransactionType.Expense),
        ("Yatırım Geliri","mdi:cash-plus",           "#1FB585", TransactionType.Income),
        // ── Ek gelir kategorileri ──
        ("Serbest Çalışma","mdi:briefcase-outline",  "#0F8B6C", TransactionType.Income),
        ("Kira Geliri",   "mdi:home-city-outline",   "#1FB585", TransactionType.Income),
        ("Faiz/Temettü",  "mdi:bank-outline",        "#2E7D32", TransactionType.Income),
        ("İade",          "mdi:cash-refund",         "#0F8B6C", TransactionType.Income),
        ("Emekli Maaşı",  "mdi:account-cash-outline","#1FB585", TransactionType.Income),
        // ── Ek gider kategorileri ──
        ("Giyim",         "mdi:tshirt-crew-outline", "#C2410C", TransactionType.Expense),
        ("Eğitim",        "mdi:school-outline",      "#1E5F8A", TransactionType.Expense),
        ("Akaryakıt",     "mdi:gas-station-outline", "#B7651C", TransactionType.Expense),
        ("Telefon/İnternet","mdi:wifi",              "#0F6E8B", TransactionType.Expense),
        ("Sigorta",       "mdi:shield-check-outline","#5A6B3D", TransactionType.Expense),
        ("Vergi",         "mdi:file-document-outline","#7A3D3D", TransactionType.Expense),
        ("Kişisel Bakım", "mdi:spa-outline",         "#9C5A7A", TransactionType.Expense),
        ("Seyahat",       "mdi:airplane",            "#1E5F8A", TransactionType.Expense),
        ("Spor",          "mdi:dumbbell",            "#2E7D6B", TransactionType.Expense),
        ("Bağış",         "mdi:hand-heart-outline",  "#B0341E", TransactionType.Expense),
    ];

    public async Task<ApiResponse<IReadOnlyList<CategoryDto>>> GetAllAsync(int userId, TransactionType? type, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        // Aktif scope kişisel ise kullanıcı + sistem; household ise sadece o household + sistem.
        var query = scope.HasValue
            ? context.Categories.AsNoTracking()
                .Where(x => x.HouseholdId == scope.Value
                         || (x.IsSystem && x.UserId == null))
            : context.Categories.AsNoTracking()
                .Where(x => (x.UserId == userId && x.HouseholdId == null)
                         || (x.IsSystem && x.UserId == null));

        if (type.HasValue)
            query = query.Where(x => x.Type == type.Value);

        // Memory safety: kategori sayıları küçük olsa da paginated DTO eklenene kadar üst sınır.
        var items = await query
            .OrderByDescending(x => x.IsSystem)
            .ThenBy(x => x.Name)
            .Take(500)
            .ToListAsync(cancellationToken);

        var dtos = mapper.Map<IReadOnlyList<CategoryDto>>(items);

        // Kullanım sayısı: aktif scope'taki (soft-delete hariç) işlemleri kategori bazlı tek sorguda say.
        // N+1 yok — GroupBy ile dictionary, sonra DTO'lara dağıt.
        var categoryIds = items.Select(x => x.Id).ToList();
        var txQuery = scope.HasValue
            ? context.Transactions.AsNoTracking().Where(t => t.HouseholdId == scope.Value)
            : context.Transactions.AsNoTracking().Where(t => t.HouseholdId == null && t.UserId == userId);

        var counts = await txQuery
            .Where(t => categoryIds.Contains(t.CategoryId))
            .GroupBy(t => t.CategoryId)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.CategoryId, g => g.Count, cancellationToken);

        foreach (var dto in dtos)
            dto.TransactionCount = counts.TryGetValue(dto.Id, out var c) ? c : 0;

        return ApiResponse<IReadOnlyList<CategoryDto>>.Success(dtos);
    }

    public async Task<ApiResponse<CategoryDto>> GetByIdAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Categories.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id
                                       && (x.HouseholdId == scope.Value
                                           || (x.IsSystem && x.UserId == null)),
                                     cancellationToken)
            : await context.Categories.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id
                                       && ((x.UserId == userId && x.HouseholdId == null)
                                           || (x.IsSystem && x.UserId == null)),
                                     cancellationToken);

        if (entity is null)
            return ApiResponse<CategoryDto>.Fail("Kategori bulunamadı.", 404, errorCode: ErrorCodes.CategoryNotFound);

        return ApiResponse<CategoryDto>.Success(mapper.Map<CategoryDto>(entity));
    }

    public async Task<ApiResponse<CategoryDto>> CreateAsync(int userId, CreateCategoryDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        // Önceden dto.HouseholdId vardı; aktif scope'a göre normalize. Eğer DTO ayrı bir household
        // istiyorsa member kontrolü yap (sağlamlık için).
        var targetHouseholdId = scope;
        if (dto.HouseholdId.HasValue)
        {
            var access = await HouseholdScope.CheckMemberAccessAsync(context, userId, dto.HouseholdId.Value, cancellationToken);

            if (access == HouseholdAccess.NotMember)
                return ApiResponse<CategoryDto>.Fail("Bu aileye erişiminiz yok.", 403, errorCode: ErrorCodes.HouseholdAccessDenied);

            if (access == HouseholdAccess.PremiumRequired)
                return ApiResponse<CategoryDto>.Fail("Bu özellik premium üyelik gerektirir.", 403, errorCode: ErrorCodes.PremiumRequired);
            targetHouseholdId = dto.HouseholdId;
        }

        var trimmed = dto.Name.Trim();

        // Aynı isim aktif scope içinde olamaz.
        var duplicate = targetHouseholdId.HasValue
            ? await context.Categories.AnyAsync(x =>
                (x.HouseholdId == targetHouseholdId.Value || (x.IsSystem && x.UserId == null))
                && x.Type == dto.Type
                && x.Name.ToLower() == trimmed.ToLower(), cancellationToken)
            : await context.Categories.AnyAsync(x =>
                ((x.UserId == userId && x.HouseholdId == null) || (x.IsSystem && x.UserId == null))
                && x.Type == dto.Type
                && x.Name.ToLower() == trimmed.ToLower(), cancellationToken);
        if (duplicate)
            return ApiResponse<CategoryDto>.Fail("Bu isimde bir kategori zaten var.", 409, errorCode: ErrorCodes.CategoryNameExists);

        var entity = new Category
        {
            Name = trimmed,
            Icon = dto.Icon.Trim(),
            Emoji = string.IsNullOrWhiteSpace(dto.Emoji) ? null : dto.Emoji.Trim(),
            Color = string.IsNullOrWhiteSpace(dto.Color) ? null : dto.Color.Trim(),
            Type = dto.Type,
            UserId = userId,
            HouseholdId = targetHouseholdId,
            IsSystem = false,
        };

        await context.Categories.AddAsync(entity, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        return ApiResponse<CategoryDto>.Success(mapper.Map<CategoryDto>(entity), "Kategori eklendi.", 201);
    }

    public async Task<ApiResponse<CategoryDto>> UpdateAsync(int userId, int id, UpdateCategoryDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Categories.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.Categories.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<CategoryDto>.Fail("Kategori bulunamadı.", 404, errorCode: ErrorCodes.CategoryNotFound);

        if (entity.IsSystem)
            return ApiResponse<CategoryDto>.Fail("Sistem kategorisi düzenlenemez.", 400, errorCode: ErrorCodes.CategorySystemImmutableEdit);

        // Sahiplik kuralı: her kaydı yalnız oluşturan düzenler — aile kaydı olsa bile owner/admin değil.
        if (entity.UserId != userId)
            return ApiResponse<CategoryDto>.Fail("Bu kaydı yalnız oluşturan düzenleyebilir.", 403, errorCode: ErrorCodes.OnlyOwnerEdits);

        var trimmed = dto.Name.Trim();

        var duplicate = scope.HasValue
            ? await context.Categories.AnyAsync(x =>
                x.HouseholdId == scope.Value
                && x.Type == entity.Type
                && x.Id != id
                && x.Name.ToLower() == trimmed.ToLower(), cancellationToken)
            : await context.Categories.AnyAsync(x =>
                x.UserId == userId && x.HouseholdId == null
                && x.Type == entity.Type
                && x.Id != id
                && x.Name.ToLower() == trimmed.ToLower(), cancellationToken);
        if (duplicate)
            return ApiResponse<CategoryDto>.Fail("Bu isimde bir kategori zaten var.", 409, errorCode: ErrorCodes.CategoryNameExists);

        entity.Name = trimmed;
        entity.Icon = dto.Icon.Trim();
        entity.Emoji = string.IsNullOrWhiteSpace(dto.Emoji) ? null : dto.Emoji.Trim();
        entity.Color = string.IsNullOrWhiteSpace(dto.Color) ? null : dto.Color.Trim();

        await context.SaveChangesAsync(cancellationToken);

        return ApiResponse<CategoryDto>.Success(mapper.Map<CategoryDto>(entity), "Kategori güncellendi.");
    }

    public async Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Categories.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == scope.Value, cancellationToken)
            : await context.Categories.FirstOrDefaultAsync(x => x.Id == id && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<string>.Fail("Kategori bulunamadı.", 404, errorCode: ErrorCodes.CategoryNotFound);

        if (entity.IsSystem)
            return ApiResponse<string>.Fail("Sistem kategorisi silinemez.", 400, errorCode: ErrorCodes.CategorySystemImmutableDelete);

        // Sahiplik kuralı: her kaydı yalnız oluşturan siler — aile kaydı olsa bile owner/admin değil.
        if (entity.UserId != userId)
            return ApiResponse<string>.Fail("Bu kaydı yalnız oluşturan silebilir.", 403, errorCode: ErrorCodes.OnlyOwnerDeletes);

        context.Categories.Remove(entity);
        await context.SaveChangesAsync(cancellationToken);

        return ApiResponse<string>.Success("", "Kategori silindi.");
    }

    public async Task<ApiResponse<string>> MergeAsync(int userId, int sourceId, int targetId, CancellationToken cancellationToken = default)
    {
        if (sourceId == targetId)
            return ApiResponse<string>.Fail("Kategori kendisiyle birleştirilemez.", 400, errorCode: ErrorCodes.CategoryMergeSelf);

        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        // Her iki kategori de aktif scope'ta erişilebilir olmalı (kişisel/sistem ya da aile).
        var accessible = scope.HasValue
            ? context.Categories.Where(x => x.HouseholdId == scope.Value || (x.IsSystem && x.UserId == null))
            : context.Categories.Where(x => (x.UserId == userId && x.HouseholdId == null) || (x.IsSystem && x.UserId == null));

        var source = await accessible.FirstOrDefaultAsync(x => x.Id == sourceId, cancellationToken);
        var target = await accessible.FirstOrDefaultAsync(x => x.Id == targetId, cancellationToken);

        if (source is null)
            return ApiResponse<string>.Fail("Kaynak kategori bulunamadı.", 404, errorCode: ErrorCodes.CategorySourceNotFound);
        if (target is null)
            return ApiResponse<string>.Fail("Hedef kategori bulunamadı.", 404, errorCode: ErrorCodes.CategoryTargetNotFound);

        if (source.IsSystem)
            return ApiResponse<string>.Fail("Sistem kategorisi birleştirilemez.", 400, errorCode: ErrorCodes.CategorySystemImmutableMerge);

        // Sahiplik kuralı: kaynağı yalnız oluşturan birleştirebilir.
        if (source.UserId != userId)
            return ApiResponse<string>.Fail("Bu kaydı yalnız oluşturan birleştirebilir.", 403, errorCode: ErrorCodes.OnlyOwnerMerges);

        if (source.Type != target.Type)
            return ApiResponse<string>.Fail("Yalnız aynı tipteki kategoriler birleştirilebilir.", 400, errorCode: ErrorCodes.CategoryMergeTypeMismatch);

        // Sahiplik tutarlılığı: aile scope'unda kaynak kategoride BAŞKA üyelerin kayıtları varsa
        // merge onların işlemlerini de yeniden kategorize ederdi — "her kaydı yalnız oluşturan
        // düzenler" sözleşmesi gereği engelle. (Kişisel scope'ta tüm kayıtlar zaten kullanıcınındır.)
        if (scope.HasValue)
        {
            var hasOthers = await context.Transactions.AnyAsync(t => t.CategoryId == sourceId && t.UserId != userId, cancellationToken)
                         || await context.RecurringRules.AnyAsync(r => r.CategoryId == sourceId && r.UserId != userId, cancellationToken);
            if (hasOthers)
                return ApiResponse<string>.Fail("Bu kategoride başka üyelerin kayıtları var; yalnızca tüm kayıtları sana ait olan bir kategori birleştirilebilir.", 409, errorCode: ErrorCodes.CategoryMergeHasOthers);
        }

        await using var dbTx = await context.Database.BeginTransactionAsync(cancellationToken);

        // İşlem ve tekrarlayan kuralları source -> target taşı.
        await context.Transactions
            .Where(t => t.CategoryId == sourceId)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.CategoryId, targetId), cancellationToken);

        await context.RecurringRules
            .Where(r => r.CategoryId == sourceId)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.CategoryId, targetId), cancellationToken);

        // Kaynağın bütçeleri soft-delete (hedefin bütçeleri korunur; unique index (User/Category/Month/Year)
        // çakışmasını önlemek için taşıma yapmıyoruz).
        await context.Budgets
            .Where(b => b.CategoryId == sourceId)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.IsDeleted, true), cancellationToken);

        // Kaynak kategoriyi soft-delete.
        await context.Categories
            .Where(c => c.Id == sourceId)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.IsDeleted, true), cancellationToken);

        await dbTx.CommitAsync(cancellationToken);

        return ApiResponse<string>.Success("", "Kategoriler birleştirildi.");
    }

    public async Task SeedGlobalSystemCategoriesAsync(CancellationToken cancellationToken = default)
    {
        // Idempotent: yalnızca SeedDefaults'ta olup DB'de henüz olmayan sistem
        // kategorilerini ekler. Böylece yeni eklenen ("Yatırım" gibi) mevcut DB'lere de gelir.
        var existingNames = await context.Categories
            .Where(x => x.IsSystem && x.UserId == null)
            .Select(x => x.Name)
            .ToListAsync(cancellationToken);

        var missing = SeedDefaults
            .Where(s => !existingNames.Contains(s.Name))
            .Select(s => new Category
            {
                Name = s.Name,
                Icon = s.Icon,
                Color = s.Color,
                Type = s.Type,
                UserId = null,
                IsSystem = true,
            })
            .ToList();

        if (missing.Count == 0) return;

        await context.Categories.AddRangeAsync(missing, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
    }
}
