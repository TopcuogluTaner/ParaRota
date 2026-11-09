using MediatR;
using ParaRota.Application.DTOs.Transactions;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.TransactionFeatures.Queries.GetTransactions;

public sealed class GetTransactionsQueryHandler(ITransactionService transactionService)
    : IRequestHandler<GetTransactionsQuery, ApiResponse<PagedResponse<TransactionDto>>>
{
    public Task<ApiResponse<PagedResponse<TransactionDto>>> Handle(GetTransactionsQuery request, CancellationToken cancellationToken)
        => transactionService.GetAllAsync(request.UserId, request.Params, cancellationToken);
}
