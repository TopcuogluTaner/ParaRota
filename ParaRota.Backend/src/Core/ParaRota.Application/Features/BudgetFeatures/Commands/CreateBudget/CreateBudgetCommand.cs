using MediatR;
using ParaRota.Application.DTOs.Budgets;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.BudgetFeatures.Commands.CreateBudget;

public sealed record CreateBudgetCommand(int UserId, CreateBudgetDto Dto) : IRequest<ApiResponse<BudgetDto>>;
