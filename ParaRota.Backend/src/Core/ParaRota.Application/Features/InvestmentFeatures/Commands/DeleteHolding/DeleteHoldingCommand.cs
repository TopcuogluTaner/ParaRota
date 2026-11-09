using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.InvestmentFeatures.Commands.DeleteHolding;

public sealed record DeleteHoldingCommand(int UserId, int Id) : IRequest<ApiResponse<string>>;
