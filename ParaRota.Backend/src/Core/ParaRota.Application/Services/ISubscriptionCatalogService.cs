using ParaRota.Application.DTOs.SubscriptionCatalog;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Services;

public interface ISubscriptionCatalogService
{
    /// <summary>Kullanıcı şeridi: aktif item'lar + sistem "Abonelikler" kategori id'si.</summary>
    Task<ApiResponse<SubscriptionCatalogDto>> GetAsync(CancellationToken cancellationToken = default);

    /// <summary>Admin listesi: pasifler dahil tüm item'lar.</summary>
    Task<ApiResponse<IReadOnlyList<SubscriptionCatalogItemDto>>> AdminListAsync(CancellationToken cancellationToken = default);

    Task<ApiResponse<SubscriptionCatalogItemDto>> AdminCreateAsync(CreateSubscriptionCatalogItemDto dto, CancellationToken cancellationToken = default);

    Task<ApiResponse<SubscriptionCatalogItemDto>> AdminUpdateAsync(int id, UpdateSubscriptionCatalogItemDto dto, CancellationToken cancellationToken = default);

    Task<ApiResponse<string>> AdminDeleteAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>Startup seed — Key bazlı idempotent, yalnız eksik kayıtları ekler.</summary>
    Task SeedDefaultsAsync(CancellationToken cancellationToken = default);
}
