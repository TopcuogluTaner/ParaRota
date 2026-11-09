using MediatR;
using ParaRota.Application.DTOs.Transactions;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.TransactionFeatures.Queries.GetTransactionById;

public sealed record GetTransactionByIdQuery(int UserId, int Id) : IRequest<ApiResponse<TransactionDto>>;
