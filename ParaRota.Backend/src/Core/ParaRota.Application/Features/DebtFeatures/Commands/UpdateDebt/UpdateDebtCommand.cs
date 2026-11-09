using MediatR;
using ParaRota.Application.DTOs.Debts;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DebtFeatures.Commands.UpdateDebt;

public sealed record UpdateDebtCommand(int UserId, int DebtId, UpdateDebtDto Dto) : IRequest<ApiResponse<DebtDto>>;
