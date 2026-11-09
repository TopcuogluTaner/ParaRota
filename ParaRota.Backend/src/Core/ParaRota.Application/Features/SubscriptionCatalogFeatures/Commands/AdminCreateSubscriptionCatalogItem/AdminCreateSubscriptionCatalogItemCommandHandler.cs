using MediatR;
using ParaRota.Application.DTOs.SubscriptionCatalog;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.SubscriptionCatalogFeatures.Commands.AdminCreateSubscriptionCatalogItem;

public sealed class AdminCreateSubscriptionCatalogItemCommandHandler(ISubscriptionCatalogService service)
    : IRequestHandler<AdminCreateSubscriptionCatalogItemCommand, ApiResponse<SubscriptionCatalogItemDto>>
{
    public Task<ApiResponse<SubscriptionCatalogItemDto>> Handle(AdminCreateSubscriptionCatalogItemCommand request, CancellationToken cancellationToken)
        => service.AdminCreateAsync(request.Dto, cancellationToken);
}
