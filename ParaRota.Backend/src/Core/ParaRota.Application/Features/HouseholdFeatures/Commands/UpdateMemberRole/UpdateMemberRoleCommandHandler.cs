using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.UpdateMemberRole;

public sealed class UpdateMemberRoleCommandHandler(IHouseholdService service)
    : IRequestHandler<UpdateMemberRoleCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(UpdateMemberRoleCommand request, CancellationToken cancellationToken)
        => service.UpdateMemberRoleAsync(request.UserId, request.HouseholdId, request.MemberUserId, request.Dto.Role, cancellationToken);
}
