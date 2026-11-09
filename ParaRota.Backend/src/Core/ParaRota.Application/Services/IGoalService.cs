using ParaRota.Application.DTOs.Goals;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Services;

public interface IGoalService
{
    Task<ApiResponse<IReadOnlyList<GoalDto>>> GetAllAsync(int userId, CancellationToken cancellationToken = default);
    Task<ApiResponse<GoalDto>> GetByIdAsync(int userId, int id, CancellationToken cancellationToken = default);
    Task<ApiResponse<GoalDto>> CreateAsync(int userId, CreateGoalDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<GoalDto>> UpdateAsync(int userId, int id, UpdateGoalDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default);
}
