using MediatR;
using ParaRota.Application.DTOs.Transactions;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.TransactionFeatures.Queries.GetTransactionById;

public sealed class GetTransactionByIdQueryHandler(ITransactionService transactionService)
    : IRequestHandler<GetTransactionByIdQuery, ApiResponse<TransactionDto>>
{
    public Task<ApiResponse<TransactionDto>> Handle(GetTransactionByIdQuery request, CancellationToken cancellationToken)
        => transactionService.GetByIdAsync(request.UserId, request.Id, cancellationToken);
}
