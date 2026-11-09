using MediatR;
using ParaRota.Application.DTOs.Debts;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DebtFeatures.Queries.GetMyDebts;

public sealed class GetMyDebtsQueryHandler(IDebtService service)
    : IRequestHandler<GetMyDebtsQuery, ApiResponse<IReadOnlyList<DebtListItemDto>>>
{
    public Task<ApiResponse<IReadOnlyList<DebtListItemDto>>> Handle(GetMyDebtsQuery request, CancellationToken cancellationToken)
        => service.GetMyDebtsAsync(request.UserId, request.Status, cancellationToken);
}
