using MediatR;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Commands.UpdateRecurringRule;

public sealed class UpdateRecurringRuleCommandHandler(IRecurringRuleService service)
    : IRequestHandler<UpdateRecurringRuleCommand, ApiResponse<RecurringRuleDto>>
{
    public Task<ApiResponse<RecurringRuleDto>> Handle(UpdateRecurringRuleCommand request, CancellationToken cancellationToken)
        => service.UpdateAsync(request.UserId, request.Id, request.Dto, cancellationToken);
}
