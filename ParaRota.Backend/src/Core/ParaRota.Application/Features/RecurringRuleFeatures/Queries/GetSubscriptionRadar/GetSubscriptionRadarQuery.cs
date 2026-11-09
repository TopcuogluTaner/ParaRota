using MediatR;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Queries.GetSubscriptionRadar;

public sealed record GetSubscriptionRadarQuery(int UserId)
    : IRequest<ApiResponse<SubscriptionRadarDto>>;
