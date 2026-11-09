using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.CreateHousehold;

public sealed class CreateHouseholdCommandHandler(IHouseholdService service)
    : IRequestHandler<CreateHouseholdCommand, ApiResponse<HouseholdDto>>
{
    public Task<ApiResponse<HouseholdDto>> Handle(CreateHouseholdCommand request, CancellationToken cancellationToken)
        => service.CreateAsync(request.UserId, request.Dto, cancellationToken);
}
