using MediatR;
using ParaRota.Application.DTOs.Budgets;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.BudgetFeatures.Queries.GetBudgets;

public sealed class GetBudgetsQueryHandler(IBudgetService service)
    : IRequestHandler<GetBudgetsQuery, ApiResponse<IReadOnlyList<BudgetDto>>>
{
    public Task<ApiResponse<IReadOnlyList<BudgetDto>>> Handle(GetBudgetsQuery request, CancellationToken cancellationToken)
        => service.GetAllAsync(request.UserId, request.Month, request.Year, cancellationToken);
}
