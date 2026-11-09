using Hangfire;
using ParaRota.Application.DTOs.Households;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Services;

public interface IHouseholdService
{
    Task<ApiResponse<IReadOnlyList<HouseholdDto>>> GetMineAsync(int userId, CancellationToken cancellationToken = default);

    // Üyelik listesi — premium'dan BAĞIMSIZ (premium'u biten üye ailesini görüp ayrılabilsin;
    // yalnız ad/rol/üye sayısı döner, aile verisi içermez).
    Task<ApiResponse<IReadOnlyList<HouseholdDto>>> GetMyMembershipsAsync(int userId, CancellationToken cancellationToken = default);
    Task<ApiResponse<HouseholdDto>> GetByIdAsync(int userId, int householdId, CancellationToken cancellationToken = default);
    Task<ApiResponse<HouseholdDto>> CreateAsync(int userId, CreateHouseholdDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<HouseholdDto>> UpdateAsync(int userId, int householdId, UpdateHouseholdDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<IReadOnlyList<HouseholdMemberDto>>> GetMembersAsync(int userId, int householdId, CancellationToken cancellationToken = default);
    Task<ApiResponse<IReadOnlyList<HouseholdInviteDto>>> GetPendingInvitesAsync(int userId, int householdId, CancellationToken cancellationToken = default);
    Task<ApiResponse<HouseholdInviteDto>> InviteAsync(int userId, int householdId, InviteToHouseholdDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<AcceptInviteResultDto>> AcceptInviteAsync(int userId, AcceptInviteDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> CancelInviteAsync(int userId, int householdId, int inviteId, CancellationToken cancellationToken = default);
    Task<ApiResponse<HouseholdInviteDto>> ResendInviteAsync(int userId, int householdId, int inviteId, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> RemoveMemberAsync(int userId, int householdId, int memberUserId, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> UpdateMemberRoleAsync(int userId, int householdId, int memberUserId, HouseholdMemberRole newRole, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> LeaveAsync(int userId, int householdId, LeaveHouseholdDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> TransferOwnershipAsync(int userId, int householdId, int newOwnerUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Süresi geçmiş Pending davetleri Expired'a çeker. Hangfire recurring job tarafından çağırılır.
    /// </summary>
    // Hangfire: aynı job'ın iki instance'ı çakışmasın (restart/uzun koşu senaryosu).
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    Task<int> ExpireOldInvitesAsync(CancellationToken cancellationToken = default);
}
