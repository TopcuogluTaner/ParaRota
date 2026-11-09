using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.LeaveHousehold;

public sealed class LeaveHouseholdCommandHandler(IHouseholdService service)
    : IRequestHandler<LeaveHouseholdCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(LeaveHouseholdCommand request, CancellationToken cancellationToken)
        => service.LeaveAsync(request.UserId, request.HouseholdId, request.Dto, cancellationToken);
}
