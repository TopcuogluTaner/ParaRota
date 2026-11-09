using MediatR;
using ParaRota.Application.DTOs.Debts;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DebtFeatures.Commands.AddDebtPayment;

public sealed record AddDebtPaymentCommand(int UserId, int DebtId, AddDebtPaymentDto Dto) : IRequest<ApiResponse<DebtDto>>;
