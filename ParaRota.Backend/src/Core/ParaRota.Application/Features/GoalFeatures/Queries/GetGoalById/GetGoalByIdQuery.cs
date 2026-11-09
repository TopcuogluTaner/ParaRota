using MediatR;
using ParaRota.Application.DTOs.Goals;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.GoalFeatures.Queries.GetGoalById;

public sealed record GetGoalByIdQuery(int UserId, int Id) : IRequest<ApiResponse<GoalDto>>;
