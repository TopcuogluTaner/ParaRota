using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DebtFeatures.Commands.DeleteDebt;

public sealed record DeleteDebtCommand(int UserId, int DebtId) : IRequest<ApiResponse<string>>;
