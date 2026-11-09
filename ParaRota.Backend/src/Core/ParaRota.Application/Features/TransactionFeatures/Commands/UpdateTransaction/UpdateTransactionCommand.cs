using MediatR;
using ParaRota.Application.DTOs.Transactions;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.TransactionFeatures.Commands.UpdateTransaction;

public sealed record UpdateTransactionCommand(int UserId, int Id, UpdateTransactionDto Dto)
    : IRequest<ApiResponse<TransactionDto>>;
