using MediatR;
using ParaRota.Application.DTOs.Debts;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DebtFeatures.Queries.GetDebtById;

public sealed class GetDebtByIdQueryHandler(IDebtService service)
    : IRequestHandler<GetDebtByIdQuery, ApiResponse<DebtDto>>
{
    public Task<ApiResponse<DebtDto>> Handle(GetDebtByIdQuery request, CancellationToken cancellationToken)
        => service.GetByIdAsync(request.UserId, request.DebtId, cancellationToken);
}
