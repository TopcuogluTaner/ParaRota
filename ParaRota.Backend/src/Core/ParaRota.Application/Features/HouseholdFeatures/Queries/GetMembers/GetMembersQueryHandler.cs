using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Queries.GetMembers;

public sealed class GetMembersQueryHandler(IHouseholdService service)
    : IRequestHandler<GetMembersQuery, ApiResponse<IReadOnlyList<HouseholdMemberDto>>>
{
    public Task<ApiResponse<IReadOnlyList<HouseholdMemberDto>>> Handle(GetMembersQuery request, CancellationToken cancellationToken)
        => service.GetMembersAsync(request.UserId, request.HouseholdId, cancellationToken);
}
