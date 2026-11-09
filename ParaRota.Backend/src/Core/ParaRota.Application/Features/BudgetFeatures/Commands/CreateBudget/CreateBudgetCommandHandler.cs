using MediatR;
using ParaRota.Application.DTOs.Budgets;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.BudgetFeatures.Commands.CreateBudget;

public sealed class CreateBudgetCommandHandler(IBudgetService service)
    : IRequestHandler<CreateBudgetCommand, ApiResponse<BudgetDto>>
{
    public Task<ApiResponse<BudgetDto>> Handle(CreateBudgetCommand request, CancellationToken cancellationToken)
        => service.CreateAsync(request.UserId, request.Dto, cancellationToken);
}
