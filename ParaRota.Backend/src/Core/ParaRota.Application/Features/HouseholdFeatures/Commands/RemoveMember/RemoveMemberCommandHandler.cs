using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.RemoveMember;

public sealed class RemoveMemberCommandHandler(IHouseholdService service)
    : IRequestHandler<RemoveMemberCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(RemoveMemberCommand request, CancellationToken cancellationToken)
        => service.RemoveMemberAsync(request.UserId, request.HouseholdId, request.MemberUserId, cancellationToken);
}
