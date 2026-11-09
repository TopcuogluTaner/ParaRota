using Microsoft.EntityFrameworkCore;
using ParaRota.Application.DTOs.SubscriptionCatalog;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class SubscriptionCatalogService(AppDbContext context) : ISubscriptionCatalogService
{
    /// <summary>
    /// Türkiye'de popüler aboneliklerin varsayılan katalogu. Fiyatlar Haziran 2026 web
    /// araştırmasından; resmi fiyat API'si olmadığından admin panelinden güncellenir.
    /// Seed Key bazlı idempotent — buradaki değişiklik mevcut DB kayıtlarını EZMEZ.
    /// </summary>
    private static readonly (string Key, string Name, string Icon, string Color, decimal Amount)[] SeedDefaults =
    [
        ("netflix",    "Netflix",            "mdi:netflix",            "#E50914", 289.99m),
        ("spotify",    "Spotify Premium",    "mdi:spotify",            "#1DB954",  99.00m),
        ("youtube",    "YouTube Premium",    "mdi:youtube",            "#FF0000",  79.99m),
        ("disney",     "Disney+",            "mdi:movie-open-outline", "#113CCF", 164.99m),
        ("prime",      "Amazon Prime",       "mdi:play-box-outline",   "#00A8E1",  39.00m),
        ("max",        "HBO Max",            "mdi:television-play",    "#002BE7", 229.99m),
        ("exxen",      "Exxen",              "mdi:television-classic", "#E3B505", 360.00m),
        ("tabii",      "tabii",              "mdi:television-play",    "#5F2EEA",  99.00m),
        ("icloud",     "iCloud+ (50 GB)",    "mdi:apple-icloud",       "#3693F3",  39.99m),
        ("google-one", "Google One (100 GB)","mdi:google",             "#4285F4",  49.99m),
        ("chatgpt",    "ChatGPT Plus",       "mdi:robot-outline",      "#10A37F", 822.00m),
    ];

    public async Task<ApiResponse<SubscriptionCatalogDto>> GetAsync(CancellationToken cancellationToken = default)
    {
        // Sistem "Abonelikler" kategori id'si server-side çözülür — isim eşleştirme
        // frontend'e bırakılmaz. Seed startup'ta garanti; yokluğu konfigürasyon hatasıdır.
        var categoryId = await context.Categories.AsNoTracking()
            .Where(x => x.IsSystem && x.UserId == null && x.Name == "Abonelikler")
            .Select(x => (int?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (categoryId is null)
            return ApiResponse<SubscriptionCatalogDto>.Fail("Abonelikler kategorisi bulunamadı.", 500, errorCode: ErrorCodes.SubscriptionsCategoryMissing);

        var items = await context.SubscriptionCatalogItems.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return ApiResponse<SubscriptionCatalogDto>.Success(new SubscriptionCatalogDto
        {
            CategoryId = categoryId.Value,
            Items = items.Select(Map).ToList(),
        });
    }

    public async Task<ApiResponse<IReadOnlyList<SubscriptionCatalogItemDto>>> AdminListAsync(CancellationToken cancellationToken = default)
    {
        var items = await context.SubscriptionCatalogItems.AsNoTracking()
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return ApiResponse<IReadOnlyList<SubscriptionCatalogItemDto>>.Success(items.Select(Map).ToList());
    }

    public async Task<ApiResponse<SubscriptionCatalogItemDto>> AdminCreateAsync(CreateSubscriptionCatalogItemDto dto, CancellationToken cancellationToken = default)
    {
        var key = dto.Key.Trim().ToLowerInvariant();

        var exists = await context.SubscriptionCatalogItems.AnyAsync(x => x.Key == key, cancellationToken);
        if (exists)
            return ApiResponse<SubscriptionCatalogItemDto>.Fail("Bu anahtarla bir katalog kaydı zaten var.", 409, errorCode: ErrorCodes.SubscriptionCatalogKeyExists);

        var entity = new SubscriptionCatalogItem
        {
            Key = key,
            Name = dto.Name.Trim(),
            Icon = dto.Icon.Trim(),
            Color = dto.Color.Trim(),
            SuggestedAmount = dto.SuggestedAmount,
            Currency = dto.Currency.Trim().ToUpperInvariant(),
            Frequency = dto.Frequency,
            SortOrder = dto.SortOrder,
            IsActive = dto.IsActive,
        };

        await context.SubscriptionCatalogItems.AddAsync(entity, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        return ApiResponse<SubscriptionCatalogItemDto>.Success(Map(entity), "Katalog kaydı eklendi.", 201);
    }

    public async Task<ApiResponse<SubscriptionCatalogItemDto>> AdminUpdateAsync(int id, UpdateSubscriptionCatalogItemDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await context.SubscriptionCatalogItems.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
            return ApiResponse<SubscriptionCatalogItemDto>.Fail("Katalog kaydı bulunamadı.", 404, errorCode: ErrorCodes.SubscriptionCatalogItemNotFound);

        entity.Name = dto.Name.Trim();
        entity.Icon = dto.Icon.Trim();
        entity.Color = dto.Color.Trim();
        entity.SuggestedAmount = dto.SuggestedAmount;
        entity.Currency = dto.Currency.Trim().ToUpperInvariant();
        entity.Frequency = dto.Frequency;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;

        await context.SaveChangesAsync(cancellationToken);

        return ApiResponse<SubscriptionCatalogItemDto>.Success(Map(entity), "Katalog kaydı güncellendi.");
    }

    public async Task<ApiResponse<string>> AdminDeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var entity = await context.SubscriptionCatalogItems.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
            return ApiResponse<string>.Fail("Katalog kaydı bulunamadı.", 404, errorCode: ErrorCodes.SubscriptionCatalogItemNotFound);

        context.SubscriptionCatalogItems.Remove(entity);
        await context.SaveChangesAsync(cancellationToken);

        return ApiResponse<string>.Success("", "Katalog kaydı silindi.");
    }

    public async Task SeedDefaultsAsync(CancellationToken cancellationToken = default)
    {
        // Idempotent: yalnızca SeedDefaults'ta olup DB'de henüz olmayan key'leri ekler;
        // admin'in panelden yaptığı fiyat/isim düzenlemeleri korunur.
        var existingKeys = await context.SubscriptionCatalogItems
            .Select(x => x.Key)
            .ToListAsync(cancellationToken);

        var missing = SeedDefaults
            .Where(s => !existingKeys.Contains(s.Key))
            .Select(s => new SubscriptionCatalogItem
            {
                Key = s.Key,
                Name = s.Name,
                Icon = s.Icon,
                Color = s.Color,
                SuggestedAmount = s.Amount,
                Currency = "TRY",
                Frequency = "monthly",
                SortOrder = Array.FindIndex(SeedDefaults, d => d.Key == s.Key),
                IsActive = true,
            })
            .ToList();

        if (missing.Count == 0) return;

        await context.SubscriptionCatalogItems.AddRangeAsync(missing, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
    }

    private static SubscriptionCatalogItemDto Map(SubscriptionCatalogItem x) => new()
    {
        Id = x.Id,
        Key = x.Key,
        Name = x.Name,
        Icon = x.Icon,
        Color = x.Color,
        SuggestedAmount = x.SuggestedAmount,
        Currency = x.Currency,
        Frequency = x.Frequency,
        SortOrder = x.SortOrder,
        IsActive = x.IsActive,
    };
}
