using MediatR;
using ParaRota.Application.DTOs.Transactions;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.TransactionFeatures.Commands.CreateTransaction;

public sealed record CreateTransactionCommand(int UserId, CreateTransactionDto Dto)
    : IRequest<ApiResponse<TransactionDto>>;
