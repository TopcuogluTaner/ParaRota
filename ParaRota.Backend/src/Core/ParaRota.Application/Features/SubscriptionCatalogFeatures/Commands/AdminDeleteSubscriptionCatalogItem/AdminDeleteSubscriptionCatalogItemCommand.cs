using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.SubscriptionCatalogFeatures.Commands.AdminDeleteSubscriptionCatalogItem;

public sealed record AdminDeleteSubscriptionCatalogItemCommand(int Id)
    : IRequest<ApiResponse<string>>;
