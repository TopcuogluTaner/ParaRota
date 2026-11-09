using MediatR;
using ParaRota.Application.DTOs.SubscriptionCatalog;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.SubscriptionCatalogFeatures.Queries.GetSubscriptionCatalog;

public sealed record GetSubscriptionCatalogQuery
    : IRequest<ApiResponse<SubscriptionCatalogDto>>;
