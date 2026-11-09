using MediatR;
using ParaRota.Application.DTOs.SubscriptionCatalog;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.SubscriptionCatalogFeatures.Commands.AdminCreateSubscriptionCatalogItem;

public sealed record AdminCreateSubscriptionCatalogItemCommand(CreateSubscriptionCatalogItemDto Dto)
    : IRequest<ApiResponse<SubscriptionCatalogItemDto>>;
