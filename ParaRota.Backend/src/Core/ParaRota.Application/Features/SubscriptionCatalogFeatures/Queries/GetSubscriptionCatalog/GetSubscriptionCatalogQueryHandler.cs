using MediatR;
using ParaRota.Application.DTOs.SubscriptionCatalog;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.SubscriptionCatalogFeatures.Queries.GetSubscriptionCatalog;

public sealed class GetSubscriptionCatalogQueryHandler(ISubscriptionCatalogService service)
    : IRequestHandler<GetSubscriptionCatalogQuery, ApiResponse<SubscriptionCatalogDto>>
{
    public Task<ApiResponse<SubscriptionCatalogDto>> Handle(GetSubscriptionCatalogQuery request, CancellationToken cancellationToken)
        => service.GetAsync(cancellationToken);
}
