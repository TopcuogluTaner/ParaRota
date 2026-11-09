using MediatR;
using ParaRota.Application.DTOs.Investments;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.InvestmentFeatures.Commands.UpdateHolding;

public sealed class UpdateHoldingCommandHandler(IInvestmentService service)
    : IRequestHandler<UpdateHoldingCommand, ApiResponse<HoldingDto>>
{
    public Task<ApiResponse<HoldingDto>> Handle(UpdateHoldingCommand request, CancellationToken cancellationToken)
        => service.UpdateAsync(request.UserId, request.Id, request.Dto, cancellationToken);
}
