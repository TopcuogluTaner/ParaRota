using MediatR;
using ParaRota.Application.DTOs.Debts;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DebtFeatures.Commands.UpdateDebt;

public sealed class UpdateDebtCommandHandler(IDebtService service)
    : IRequestHandler<UpdateDebtCommand, ApiResponse<DebtDto>>
{
    public Task<ApiResponse<DebtDto>> Handle(UpdateDebtCommand request, CancellationToken cancellationToken)
        => service.UpdateAsync(request.UserId, request.DebtId, request.Dto, cancellationToken);
}
