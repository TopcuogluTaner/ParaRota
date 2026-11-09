using MediatR;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Commands.UpdateRecurringRule;

public sealed record UpdateRecurringRuleCommand(int UserId, int Id, UpdateRecurringRuleDto Dto)
    : IRequest<ApiResponse<RecurringRuleDto>>;
