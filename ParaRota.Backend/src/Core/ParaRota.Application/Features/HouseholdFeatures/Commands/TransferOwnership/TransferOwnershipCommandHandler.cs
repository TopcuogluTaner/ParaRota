using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.TransferOwnership;

public sealed class TransferOwnershipCommandHandler(IHouseholdService service)
    : IRequestHandler<TransferOwnershipCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(TransferOwnershipCommand request, CancellationToken cancellationToken)
        => service.TransferOwnershipAsync(request.UserId, request.HouseholdId, request.NewOwnerUserId, cancellationToken);
}
