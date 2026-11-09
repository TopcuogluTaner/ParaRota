using MediatR;
using ParaRota.Application.DTOs.Debts;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DebtFeatures.Commands.CreateDebt;

public sealed record CreateDebtCommand(int UserId, CreateDebtDto Dto) : IRequest<ApiResponse<DebtDto>>;
