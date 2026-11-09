using MediatR;
using ParaRota.Application.DTOs.Budgets;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.BudgetFeatures.Queries.GetBudgetById;

public sealed class GetBudgetByIdQueryHandler(IBudgetService service)
    : IRequestHandler<GetBudgetByIdQuery, ApiResponse<BudgetDto>>
{
    public Task<ApiResponse<BudgetDto>> Handle(GetBudgetByIdQuery request, CancellationToken cancellationToken)
        => service.GetByIdAsync(request.UserId, request.Id, cancellationToken);
}
