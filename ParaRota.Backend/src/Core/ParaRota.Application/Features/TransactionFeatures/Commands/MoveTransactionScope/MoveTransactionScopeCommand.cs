using MediatR;
using ParaRota.Application.DTOs.Transactions;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.TransactionFeatures.Commands.MoveTransactionScope;

public sealed record MoveTransactionScopeCommand(int UserId, int Id, MoveTransactionScopeDto Dto)
    : IRequest<ApiResponse<TransactionDto>>;
