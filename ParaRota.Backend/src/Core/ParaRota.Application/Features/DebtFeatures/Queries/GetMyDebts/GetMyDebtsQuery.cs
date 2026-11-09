using MediatR;
using ParaRota.Application.DTOs.Debts;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Features.DebtFeatures.Queries.GetMyDebts;

public sealed record GetMyDebtsQuery(int UserId, DebtStatus? Status) : IRequest<ApiResponse<IReadOnlyList<DebtListItemDto>>>;
