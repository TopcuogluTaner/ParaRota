using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.ResendInvite;

public sealed class ResendInviteCommandHandler(IHouseholdService service)
    : IRequestHandler<ResendInviteCommand, ApiResponse<HouseholdInviteDto>>
{
    public Task<ApiResponse<HouseholdInviteDto>> Handle(ResendInviteCommand request, CancellationToken cancellationToken)
        => service.ResendInviteAsync(request.UserId, request.HouseholdId, request.InviteId, cancellationToken);
}
