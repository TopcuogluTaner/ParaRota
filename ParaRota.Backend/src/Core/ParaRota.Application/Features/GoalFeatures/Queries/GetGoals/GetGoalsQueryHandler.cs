using MediatR;
using ParaRota.Application.DTOs.Goals;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.GoalFeatures.Queries.GetGoals;

public sealed class GetGoalsQueryHandler(IGoalService service)
    : IRequestHandler<GetGoalsQuery, ApiResponse<IReadOnlyList<GoalDto>>>
{
    public Task<ApiResponse<IReadOnlyList<GoalDto>>> Handle(GetGoalsQuery request, CancellationToken cancellationToken)
        => service.GetAllAsync(request.UserId, cancellationToken);
}
