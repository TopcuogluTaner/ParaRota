using ParaRota.Application.DTOs.Dashboard;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Services;

public interface IDashboardService
{
    // month + year null ise içinde bulunulan ay alınır.
    Task<ApiResponse<DashboardSummaryDto>> GetSummaryAsync(int userId, int? month, int? year, CancellationToken cancellationToken = default);

    // Kural bazlı içgörüler (kategori sıçraması, bütçe hızı, tasarruf oranı/aşım,
    // yaklaşan hafta). İçinde bulunulan aya göre hesaplanır; en fazla 3 döner.
    Task<ApiResponse<IReadOnlyList<InsightDto>>> GetInsightsAsync(int userId, CancellationToken cancellationToken = default);
}
