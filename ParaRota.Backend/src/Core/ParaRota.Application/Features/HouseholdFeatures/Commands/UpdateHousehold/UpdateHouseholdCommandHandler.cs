using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.UpdateHousehold;

public sealed class UpdateHouseholdCommandHandler(IHouseholdService service)
    : IRequestHandler<UpdateHouseholdCommand, ApiResponse<HouseholdDto>>
{
    public Task<ApiResponse<HouseholdDto>> Handle(UpdateHouseholdCommand request, CancellationToken cancellationToken)
        => service.UpdateAsync(request.UserId, request.HouseholdId, request.Dto, cancellationToken);
}
