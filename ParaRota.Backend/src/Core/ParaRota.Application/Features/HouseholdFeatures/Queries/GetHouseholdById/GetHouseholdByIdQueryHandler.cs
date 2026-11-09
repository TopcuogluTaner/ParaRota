using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Queries.GetHouseholdById;

public sealed class GetHouseholdByIdQueryHandler(IHouseholdService service)
    : IRequestHandler<GetHouseholdByIdQuery, ApiResponse<HouseholdDto>>
{
    public Task<ApiResponse<HouseholdDto>> Handle(GetHouseholdByIdQuery request, CancellationToken cancellationToken)
        => service.GetByIdAsync(request.UserId, request.HouseholdId, cancellationToken);
}
