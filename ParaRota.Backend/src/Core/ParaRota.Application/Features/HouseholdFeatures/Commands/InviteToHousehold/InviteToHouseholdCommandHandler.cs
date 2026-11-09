using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.InviteToHousehold;

public sealed class InviteToHouseholdCommandHandler(IHouseholdService service)
    : IRequestHandler<InviteToHouseholdCommand, ApiResponse<HouseholdInviteDto>>
{
    public Task<ApiResponse<HouseholdInviteDto>> Handle(InviteToHouseholdCommand request, CancellationToken cancellationToken)
        => service.InviteAsync(request.UserId, request.HouseholdId, request.Dto, cancellationToken);
}
