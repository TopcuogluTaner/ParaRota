using MediatR;
using ParaRota.Application.DTOs.SubscriptionCatalog;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.SubscriptionCatalogFeatures.Commands.AdminUpdateSubscriptionCatalogItem;

public sealed class AdminUpdateSubscriptionCatalogItemCommandHandler(ISubscriptionCatalogService service)
    : IRequestHandler<AdminUpdateSubscriptionCatalogItemCommand, ApiResponse<SubscriptionCatalogItemDto>>
{
    public Task<ApiResponse<SubscriptionCatalogItemDto>> Handle(AdminUpdateSubscriptionCatalogItemCommand request, CancellationToken cancellationToken)
        => service.AdminUpdateAsync(request.Id, request.Dto, cancellationToken);
}
