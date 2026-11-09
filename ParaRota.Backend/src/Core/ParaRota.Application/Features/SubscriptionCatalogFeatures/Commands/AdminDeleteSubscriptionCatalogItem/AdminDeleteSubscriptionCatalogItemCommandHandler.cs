using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.SubscriptionCatalogFeatures.Commands.AdminDeleteSubscriptionCatalogItem;

public sealed class AdminDeleteSubscriptionCatalogItemCommandHandler(ISubscriptionCatalogService service)
    : IRequestHandler<AdminDeleteSubscriptionCatalogItemCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(AdminDeleteSubscriptionCatalogItemCommand request, CancellationToken cancellationToken)
        => service.AdminDeleteAsync(request.Id, cancellationToken);
}
