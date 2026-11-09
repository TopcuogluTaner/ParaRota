using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.CancelInvite;

public sealed class CancelInviteCommandHandler(IHouseholdService service)
    : IRequestHandler<CancelInviteCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(CancelInviteCommand request, CancellationToken cancellationToken)
        => service.CancelInviteAsync(request.UserId, request.HouseholdId, request.InviteId, cancellationToken);
}
