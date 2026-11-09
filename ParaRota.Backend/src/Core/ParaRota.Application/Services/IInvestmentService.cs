using ParaRota.Application.DTOs.Investments;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Services;

public interface IInvestmentService
{
    Task<ApiResponse<PortfolioDto>> GetPortfolioAsync(int userId, CancellationToken cancellationToken = default);
    Task<ApiResponse<HoldingDto>> CreateAsync(int userId, CreateHoldingDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<HoldingDto>> UpdateAsync(int userId, int id, UpdateHoldingDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<SellResultDto>> SellAsync(int userId, int id, SellHoldingDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default);
}
