using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Queries.GetMyMemberships;

public sealed class GetMyMembershipsQueryHandler(IHouseholdService service)
    : IRequestHandler<GetMyMembershipsQuery, ApiResponse<IReadOnlyList<HouseholdDto>>>
{
    public Task<ApiResponse<IReadOnlyList<HouseholdDto>>> Handle(GetMyMembershipsQuery request, CancellationToken cancellationToken)
        => service.GetMyMembershipsAsync(request.UserId, cancellationToken);
}
