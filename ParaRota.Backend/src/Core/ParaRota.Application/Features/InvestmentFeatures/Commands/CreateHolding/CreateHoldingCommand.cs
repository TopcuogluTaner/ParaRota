using MediatR;
using ParaRota.Application.DTOs.Investments;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.InvestmentFeatures.Commands.CreateHolding;

public sealed record CreateHoldingCommand(int UserId, CreateHoldingDto Dto) : IRequest<ApiResponse<HoldingDto>>;
