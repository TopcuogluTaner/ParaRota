using MediatR;
using ParaRota.Application.DTOs.Budgets;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.BudgetFeatures.Commands.UpdateBudget;

public sealed class UpdateBudgetCommandHandler(IBudgetService service)
    : IRequestHandler<UpdateBudgetCommand, ApiResponse<BudgetDto>>
{
    public Task<ApiResponse<BudgetDto>> Handle(UpdateBudgetCommand request, CancellationToken cancellationToken)
        => service.UpdateAsync(request.UserId, request.Id, request.Dto, cancellationToken);
}
