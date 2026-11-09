using MediatR;
using ParaRota.Application.DTOs.Goals;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.GoalFeatures.Queries.GetGoalById;

public sealed class GetGoalByIdQueryHandler(IGoalService service)
    : IRequestHandler<GetGoalByIdQuery, ApiResponse<GoalDto>>
{
    public Task<ApiResponse<GoalDto>> Handle(GetGoalByIdQuery request, CancellationToken cancellationToken)
        => service.GetByIdAsync(request.UserId, request.Id, cancellationToken);
}
