using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Queries.GetPendingInvites;

public sealed class GetPendingInvitesQueryHandler(IHouseholdService service)
    : IRequestHandler<GetPendingInvitesQuery, ApiResponse<IReadOnlyList<HouseholdInviteDto>>>
{
    public Task<ApiResponse<IReadOnlyList<HouseholdInviteDto>>> Handle(GetPendingInvitesQuery request, CancellationToken cancellationToken)
        => service.GetPendingInvitesAsync(request.UserId, request.HouseholdId, cancellationToken);
}
