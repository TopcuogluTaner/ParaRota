using MediatR;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Commands.CreateRecurringRule;

public sealed record CreateRecurringRuleCommand(int UserId, CreateRecurringRuleDto Dto)
    : IRequest<ApiResponse<RecurringRuleDto>>;
