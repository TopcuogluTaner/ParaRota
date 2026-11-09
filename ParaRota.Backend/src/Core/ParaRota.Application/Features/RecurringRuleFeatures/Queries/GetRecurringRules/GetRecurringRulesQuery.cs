using MediatR;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Queries.GetRecurringRules;

public sealed record GetRecurringRulesQuery(int UserId, bool? IsActive)
    : IRequest<ApiResponse<IReadOnlyList<RecurringRuleDto>>>;
