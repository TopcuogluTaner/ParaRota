using MediatR;
using ParaRota.Application.DTOs.Transactions;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.TransactionFeatures.Commands.UpdateTransaction;

public sealed class UpdateTransactionCommandHandler(ITransactionService transactionService)
    : IRequestHandler<UpdateTransactionCommand, ApiResponse<TransactionDto>>
{
    public Task<ApiResponse<TransactionDto>> Handle(UpdateTransactionCommand request, CancellationToken cancellationToken)
        => transactionService.UpdateAsync(request.UserId, request.Id, request.Dto, cancellationToken);
}
