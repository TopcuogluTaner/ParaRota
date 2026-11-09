using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.BudgetFeatures.Commands.DeleteBudget;

public sealed record DeleteBudgetCommand(int UserId, int Id) : IRequest<ApiResponse<string>>;
