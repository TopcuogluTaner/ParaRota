using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.BudgetFeatures.Commands.DeleteBudget;

public sealed class DeleteBudgetCommandHandler(IBudgetService service)
    : IRequestHandler<DeleteBudgetCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(DeleteBudgetCommand request, CancellationToken cancellationToken)
        => service.DeleteAsync(request.UserId, request.Id, cancellationToken);
}
