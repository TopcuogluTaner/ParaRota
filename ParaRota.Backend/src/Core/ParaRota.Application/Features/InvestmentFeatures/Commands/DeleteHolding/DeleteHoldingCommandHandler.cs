using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.InvestmentFeatures.Commands.DeleteHolding;

public sealed class DeleteHoldingCommandHandler(IInvestmentService service)
    : IRequestHandler<DeleteHoldingCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(DeleteHoldingCommand request, CancellationToken cancellationToken)
        => service.DeleteAsync(request.UserId, request.Id, cancellationToken);
}
