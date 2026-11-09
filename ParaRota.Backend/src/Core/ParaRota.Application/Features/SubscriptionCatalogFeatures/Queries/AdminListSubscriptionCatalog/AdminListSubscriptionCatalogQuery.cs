using MediatR;
using ParaRota.Application.DTOs.SubscriptionCatalog;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.SubscriptionCatalogFeatures.Queries.AdminListSubscriptionCatalog;

public sealed record AdminListSubscriptionCatalogQuery
    : IRequest<ApiResponse<IReadOnlyList<SubscriptionCatalogItemDto>>>;
