using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DebtFeatures.Commands.DeleteDebt;

public sealed class DeleteDebtCommandHandler(IDebtService service)
    : IRequestHandler<DeleteDebtCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(DeleteDebtCommand request, CancellationToken cancellationToken)
        => service.DeleteAsync(request.UserId, request.DebtId, cancellationToken);
}
