using MediatR;
using ParaRota.Application.DTOs.Goals;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.GoalFeatures.Commands.UpdateGoal;

public sealed record UpdateGoalCommand(int UserId, int Id, UpdateGoalDto Dto) : IRequest<ApiResponse<GoalDto>>;
