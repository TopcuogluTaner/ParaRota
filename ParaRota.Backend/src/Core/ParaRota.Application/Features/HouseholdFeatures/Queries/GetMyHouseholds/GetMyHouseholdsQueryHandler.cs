using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Queries.GetMyHouseholds;

public sealed class GetMyHouseholdsQueryHandler(IHouseholdService service)
    : IRequestHandler<GetMyHouseholdsQuery, ApiResponse<IReadOnlyList<HouseholdDto>>>
{
    public Task<ApiResponse<IReadOnlyList<HouseholdDto>>> Handle(GetMyHouseholdsQuery request, CancellationToken cancellationToken)
        => service.GetMineAsync(request.UserId, cancellationToken);
}
