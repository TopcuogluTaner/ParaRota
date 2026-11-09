using MediatR;
using ParaRota.Application.DTOs.Goals;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.GoalFeatures.Queries.GetGoals;

public sealed record GetGoalsQuery(int UserId) : IRequest<ApiResponse<IReadOnlyList<GoalDto>>>;
