using ParaRota.Application.DTOs.Budgets;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Services;

public interface IBudgetService
{
    Task<ApiResponse<IReadOnlyList<BudgetDto>>> GetAllAsync(int userId, int? month, int? year, CancellationToken cancellationToken = default);
    Task<ApiResponse<BudgetDto>> GetByIdAsync(int userId, int id, CancellationToken cancellationToken = default);
    Task<ApiResponse<BudgetDto>> CreateAsync(int userId, CreateBudgetDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<BudgetDto>> UpdateAsync(int userId, int id, UpdateBudgetDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default);

    // Dashboard summary endpoint için: seçilen ayın tüm bütçelerini AlertLevel desc + UsagePercentage desc sıralı döner.
    // Widget üst sıralarda warning/exceeded'ı, sonra normal'ı gösterir.
    Task<IReadOnlyList<BudgetDto>> GetStatusForDashboardAsync(int userId, int month, int year, CancellationToken cancellationToken = default);

    // Transaction CRUD sonrası ilgili (categoryId, month, year) için Warning/Exceeded bildirimini değerlendirir.
    // Idempotent (DedupKey) — aynı seviyeye birden fazla kez dispatch edilse de tek bildirim üretilir.
    Task EvaluateAlertsForCategoryAsync(int userId, int categoryId, int month, int year, CancellationToken cancellationToken = default);

    // Aktif HTTP header scope'undan bağımsız, açık scope (null = kişisel) için aynı değerlendirme.
    // Kaydın aktif scope'tan farklı bir kapsama taşındığı durumlar (MoveScope) için.
    Task EvaluateAlertsInScopeAsync(int userId, int? scope, int categoryId, int month, int year, CancellationToken cancellationToken = default);
}
