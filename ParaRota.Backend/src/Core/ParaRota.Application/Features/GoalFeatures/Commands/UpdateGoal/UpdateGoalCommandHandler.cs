using MediatR;
using ParaRota.Application.DTOs.Goals;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.GoalFeatures.Commands.UpdateGoal;

public sealed class UpdateGoalCommandHandler(IGoalService service)
    : IRequestHandler<UpdateGoalCommand, ApiResponse<GoalDto>>
{
    public Task<ApiResponse<GoalDto>> Handle(UpdateGoalCommand request, CancellationToken cancellationToken)
        => service.UpdateAsync(request.UserId, request.Id, request.Dto, cancellationToken);
}
