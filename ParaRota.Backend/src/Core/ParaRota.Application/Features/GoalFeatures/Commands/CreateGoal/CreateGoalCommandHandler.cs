using MediatR;
using ParaRota.Application.DTOs.Goals;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.GoalFeatures.Commands.CreateGoal;

public sealed class CreateGoalCommandHandler(IGoalService service)
    : IRequestHandler<CreateGoalCommand, ApiResponse<GoalDto>>
{
    public Task<ApiResponse<GoalDto>> Handle(CreateGoalCommand request, CancellationToken cancellationToken)
        => service.CreateAsync(request.UserId, request.Dto, cancellationToken);
}
