using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.TransactionFeatures.Commands.DeleteTransaction;

public sealed record DeleteTransactionCommand(int UserId, int Id) : IRequest<ApiResponse<string>>;
