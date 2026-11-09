using MediatR;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Queries.GetSubscriptionRadar;

public sealed class GetSubscriptionRadarQueryHandler(IRecurringRuleService service)
    : IRequestHandler<GetSubscriptionRadarQuery, ApiResponse<SubscriptionRadarDto>>
{
    public Task<ApiResponse<SubscriptionRadarDto>> Handle(GetSubscriptionRadarQuery request, CancellationToken cancellationToken)
        => service.GetSubscriptionRadarAsync(request.UserId, cancellationToken);
}
