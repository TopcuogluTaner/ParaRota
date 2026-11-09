using MediatR;
using ParaRota.Application.DTOs.Debts;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DebtFeatures.Commands.AddDebtPayment;

public sealed class AddDebtPaymentCommandHandler(IDebtService service)
    : IRequestHandler<AddDebtPaymentCommand, ApiResponse<DebtDto>>
{
    public Task<ApiResponse<DebtDto>> Handle(AddDebtPaymentCommand request, CancellationToken cancellationToken)
        => service.AddPaymentAsync(request.UserId, request.DebtId, request.Dto, cancellationToken);
}
