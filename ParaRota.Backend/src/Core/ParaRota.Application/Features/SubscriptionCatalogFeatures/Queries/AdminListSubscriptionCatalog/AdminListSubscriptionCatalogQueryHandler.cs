using MediatR;
using ParaRota.Application.DTOs.SubscriptionCatalog;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.SubscriptionCatalogFeatures.Queries.AdminListSubscriptionCatalog;

public sealed class AdminListSubscriptionCatalogQueryHandler(ISubscriptionCatalogService service)
    : IRequestHandler<AdminListSubscriptionCatalogQuery, ApiResponse<IReadOnlyList<SubscriptionCatalogItemDto>>>
{
    public Task<ApiResponse<IReadOnlyList<SubscriptionCatalogItemDto>>> Handle(AdminListSubscriptionCatalogQuery request, CancellationToken cancellationToken)
        => service.AdminListAsync(cancellationToken);
}
