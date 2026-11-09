using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.GoalFeatures.Commands.DeleteGoal;

public sealed class DeleteGoalCommandHandler(IGoalService service)
    : IRequestHandler<DeleteGoalCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(DeleteGoalCommand request, CancellationToken cancellationToken)
        => service.DeleteAsync(request.UserId, request.Id, cancellationToken);
}
