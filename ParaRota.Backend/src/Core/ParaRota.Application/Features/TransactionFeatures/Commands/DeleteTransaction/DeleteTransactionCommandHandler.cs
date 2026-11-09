using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.TransactionFeatures.Commands.DeleteTransaction;

public sealed class DeleteTransactionCommandHandler(ITransactionService transactionService)
    : IRequestHandler<DeleteTransactionCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(DeleteTransactionCommand request, CancellationToken cancellationToken)
        => transactionService.DeleteAsync(request.UserId, request.Id, cancellationToken);
}
