using MediatR;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Queries.GetRecurringRules;

public sealed class GetRecurringRulesQueryHandler(IRecurringRuleService service)
    : IRequestHandler<GetRecurringRulesQuery, ApiResponse<IReadOnlyList<RecurringRuleDto>>>
{
    public Task<ApiResponse<IReadOnlyList<RecurringRuleDto>>> Handle(GetRecurringRulesQuery request, CancellationToken cancellationToken)
        => service.GetAllAsync(request.UserId, request.IsActive, cancellationToken);
}
