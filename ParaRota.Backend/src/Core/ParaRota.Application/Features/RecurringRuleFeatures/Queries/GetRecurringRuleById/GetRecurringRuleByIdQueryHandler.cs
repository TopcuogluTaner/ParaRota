using MediatR;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Queries.GetRecurringRuleById;

public sealed class GetRecurringRuleByIdQueryHandler(IRecurringRuleService service)
    : IRequestHandler<GetRecurringRuleByIdQuery, ApiResponse<RecurringRuleDto>>
{
    public Task<ApiResponse<RecurringRuleDto>> Handle(GetRecurringRuleByIdQuery request, CancellationToken cancellationToken)
        => service.GetByIdAsync(request.UserId, request.Id, cancellationToken);
}
