using MediatR;
using ParaRota.Application.DTOs.Debts;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DebtFeatures.Queries.GetDebtById;

public sealed record GetDebtByIdQuery(int UserId, int DebtId) : IRequest<ApiResponse<DebtDto>>;
