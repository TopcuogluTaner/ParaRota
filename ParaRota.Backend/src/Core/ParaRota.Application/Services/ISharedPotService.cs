using ParaRota.Application.DTOs.SharedPots;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Services;

public interface ISharedPotService
{
    Task<ApiResponse<IReadOnlyList<SharedPotListItemDto>>> GetMyAsync(int userId, SharedPotStatus? status, CancellationToken cancellationToken = default);
    Task<ApiResponse<SharedPotDetailDto>> GetDetailAsync(int userId, int id, CancellationToken cancellationToken = default);
    Task<ApiResponse<SharedPotDetailDto>> CreateAsync(int userId, CreateSharedPotDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<SharedPotDetailDto>> UpdateAsync(int userId, int id, UpdateSharedPotDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default);

    Task<ApiResponse<SharedPotDetailDto>> AddMemberAsync(int userId, int potId, AddSharedPotMemberDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<SharedPotDetailDto>> RemoveMemberAsync(int userId, int potId, int memberId, CancellationToken cancellationToken = default);

    Task<ApiResponse<SharedPotDetailDto>> AddExpenseAsync(int userId, int potId, CreateSharedExpenseDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<SharedPotDetailDto>> DeleteExpenseAsync(int userId, int potId, int expenseId, CancellationToken cancellationToken = default);

    Task<ApiResponse<SharedPotDetailDto>> AddSettlementAsync(int userId, int potId, CreateSettlementDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<SharedPotDetailDto>> DeleteSettlementAsync(int userId, int potId, int settlementId, CancellationToken cancellationToken = default);

    /// <summary>Aktif aile scope'undaki üye adayları (kasaya eklemek için); kişiselse boş.</summary>
    Task<ApiResponse<IReadOnlyList<SharedPotCandidateDto>>> GetMemberCandidatesAsync(int userId, CancellationToken cancellationToken = default);
}
