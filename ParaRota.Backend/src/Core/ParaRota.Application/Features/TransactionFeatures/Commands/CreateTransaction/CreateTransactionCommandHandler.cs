using MediatR;
using ParaRota.Application.DTOs.Transactions;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.TransactionFeatures.Commands.CreateTransaction;

public sealed class CreateTransactionCommandHandler(ITransactionService transactionService)
    : IRequestHandler<CreateTransactionCommand, ApiResponse<TransactionDto>>
{
    public Task<ApiResponse<TransactionDto>> Handle(CreateTransactionCommand request, CancellationToken cancellationToken)
        => transactionService.CreateAsync(request.UserId, request.Dto, cancellationToken);
}
