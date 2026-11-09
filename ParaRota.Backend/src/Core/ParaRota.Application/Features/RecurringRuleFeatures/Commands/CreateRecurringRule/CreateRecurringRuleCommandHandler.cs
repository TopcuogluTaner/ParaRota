using MediatR;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Commands.CreateRecurringRule;

public sealed class CreateRecurringRuleCommandHandler(IRecurringRuleService service)
    : IRequestHandler<CreateRecurringRuleCommand, ApiResponse<RecurringRuleDto>>
{
    public Task<ApiResponse<RecurringRuleDto>> Handle(CreateRecurringRuleCommand request, CancellationToken cancellationToken)
        => service.CreateAsync(request.UserId, request.Dto, cancellationToken);
}
