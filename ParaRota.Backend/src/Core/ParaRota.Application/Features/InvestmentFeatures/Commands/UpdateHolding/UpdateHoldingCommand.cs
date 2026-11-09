using MediatR;
using ParaRota.Application.DTOs.Investments;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.InvestmentFeatures.Commands.UpdateHolding;

public sealed record UpdateHoldingCommand(int UserId, int Id, UpdateHoldingDto Dto) : IRequest<ApiResponse<HoldingDto>>;
