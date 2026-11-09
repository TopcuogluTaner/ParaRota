using MediatR;
using ParaRota.Application.DTOs.Transactions;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.TransactionFeatures.Queries.GetTransactions;

public sealed record GetTransactionsQuery(int UserId, TransactionListParams Params)
    : IRequest<ApiResponse<PagedResponse<TransactionDto>>>;
