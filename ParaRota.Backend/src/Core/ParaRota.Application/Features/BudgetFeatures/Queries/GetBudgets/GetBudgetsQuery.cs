using MediatR;
using ParaRota.Application.DTOs.Budgets;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.BudgetFeatures.Queries.GetBudgets;

public sealed record GetBudgetsQuery(int UserId, int? Month, int? Year)
    : IRequest<ApiResponse<IReadOnlyList<BudgetDto>>>;
