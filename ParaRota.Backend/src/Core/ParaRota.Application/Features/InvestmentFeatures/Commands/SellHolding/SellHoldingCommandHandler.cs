using MediatR;
using ParaRota.Application.DTOs.Investments;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.InvestmentFeatures.Commands.SellHolding;

public sealed class SellHoldingCommandHandler(IInvestmentService service)
    : IRequestHandler<SellHoldingCommand, ApiResponse<SellResultDto>>
{
    public Task<ApiResponse<SellResultDto>> Handle(SellHoldingCommand request, CancellationToken cancellationToken)
        => service.SellAsync(request.UserId, request.Id, request.Dto, cancellationToken);
}
