using MediatR;
using ParaRota.Application.DTOs.Transactions;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.TransactionFeatures.Commands.MoveTransactionScope;

public sealed class MoveTransactionScopeCommandHandler(ITransactionService transactionService)
    : IRequestHandler<MoveTransactionScopeCommand, ApiResponse<TransactionDto>>
{
    public Task<ApiResponse<TransactionDto>> Handle(MoveTransactionScopeCommand request, CancellationToken cancellationToken)
        => transactionService.MoveScopeAsync(request.UserId, request.Id, request.Dto, cancellationToken);
}
