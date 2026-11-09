using MediatR;
using ParaRota.Application.DTOs.Goals;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.GoalFeatures.Commands.CreateGoal;

public sealed record CreateGoalCommand(int UserId, CreateGoalDto Dto) : IRequest<ApiResponse<GoalDto>>;
