using MediatR;
using ParaRota.Application.DTOs.Budgets;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.BudgetFeatures.Commands.UpdateBudget;

public sealed record UpdateBudgetCommand(int UserId, int Id, UpdateBudgetDto Dto) : IRequest<ApiResponse<BudgetDto>>;
