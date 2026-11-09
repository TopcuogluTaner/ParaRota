using MediatR;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Queries.GetRecurringRuleById;

public sealed record GetRecurringRuleByIdQuery(int UserId, int Id) : IRequest<ApiResponse<RecurringRuleDto>>;
