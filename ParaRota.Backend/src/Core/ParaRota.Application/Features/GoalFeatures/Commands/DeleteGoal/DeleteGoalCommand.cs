using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.GoalFeatures.Commands.DeleteGoal;

public sealed record DeleteGoalCommand(int UserId, int Id) : IRequest<ApiResponse<string>>;
