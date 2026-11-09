using MediatR;
using ParaRota.Application.DTOs.Investments;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.InvestmentFeatures.Commands.CreateHolding;

public sealed class CreateHoldingCommandHandler(IInvestmentService service)
    : IRequestHandler<CreateHoldingCommand, ApiResponse<HoldingDto>>
{
    public Task<ApiResponse<HoldingDto>> Handle(CreateHoldingCommand request, CancellationToken cancellationToken)
        => service.CreateAsync(request.UserId, request.Dto, cancellationToken);
}
