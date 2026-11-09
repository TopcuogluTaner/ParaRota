using MediatR;
using ParaRota.Application.DTOs.SubscriptionCatalog;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.SubscriptionCatalogFeatures.Commands.AdminUpdateSubscriptionCatalogItem;

public sealed record AdminUpdateSubscriptionCatalogItemCommand(int Id, UpdateSubscriptionCatalogItemDto Dto)
    : IRequest<ApiResponse<SubscriptionCatalogItemDto>>;
