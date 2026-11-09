using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.AcceptInvite;

public sealed class AcceptInviteCommandHandler(IHouseholdService service)
    : IRequestHandler<AcceptInviteCommand, ApiResponse<AcceptInviteResultDto>>
{
    public Task<ApiResponse<AcceptInviteResultDto>> Handle(AcceptInviteCommand request, CancellationToken cancellationToken)
        => service.AcceptInviteAsync(request.UserId, request.Dto, cancellationToken);
}
