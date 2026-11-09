using ParaRota.Application.DTOs.Categories;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Services;

public interface ICategoryService
{
    Task<ApiResponse<IReadOnlyList<CategoryDto>>> GetAllAsync(int userId, TransactionType? type, CancellationToken cancellationToken = default);
    Task<ApiResponse<CategoryDto>> GetByIdAsync(int userId, int id, CancellationToken cancellationToken = default);
    Task<ApiResponse<CategoryDto>> CreateAsync(int userId, CreateCategoryDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<CategoryDto>> UpdateAsync(int userId, int id, UpdateCategoryDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default);

    // Kaynak kategoriyi hedefe birleştirir: Transaction & RecurringRule CategoryId'leri taşınır,
    // kaynağın bütçeleri soft-delete edilir (unique index çakışması önlenir), kaynak soft-delete edilir.
    Task<ApiResponse<string>> MergeAsync(int userId, int sourceId, int targetId, CancellationToken cancellationToken = default);

    // Uygulama başlangıcında bir kez çağrılır: global sistem kategorileri (UserId=NULL, IsSystem=true)
    // henüz yoksa seed eder. Idempotent.
    Task SeedGlobalSystemCategoriesAsync(CancellationToken cancellationToken = default);
}
