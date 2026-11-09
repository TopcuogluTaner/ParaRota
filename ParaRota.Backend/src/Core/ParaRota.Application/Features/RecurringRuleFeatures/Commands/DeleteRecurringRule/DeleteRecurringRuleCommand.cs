using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Commands.DeleteRecurringRule;

public sealed record DeleteRecurringRuleCommand(int UserId, int Id) : IRequest<ApiResponse<string>>;
