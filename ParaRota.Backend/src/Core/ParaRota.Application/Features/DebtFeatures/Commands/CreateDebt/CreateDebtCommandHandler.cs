using MediatR;
using ParaRota.Application.DTOs.Debts;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DebtFeatures.Commands.CreateDebt;

public sealed class CreateDebtCommandHandler(IDebtService service)
    : IRequestHandler<CreateDebtCommand, ApiResponse<DebtDto>>
{
    public Task<ApiResponse<DebtDto>> Handle(CreateDebtCommand request, CancellationToken cancellationToken)
        => service.CreateAsync(request.UserId, request.Dto, cancellationToken);
}
