using MediatR;
using ParaRota.Application.DTOs.Investments;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.InvestmentFeatures.Commands.SellHolding;

public sealed record SellHoldingCommand(int UserId, int Id, SellHoldingDto Dto) : IRequest<ApiResponse<SellResultDto>>;
