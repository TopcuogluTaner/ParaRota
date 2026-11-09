using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Commands.RunRecurringRuleOnce;

public sealed class RunRecurringRuleOnceCommandHandler(IRecurringRuleService service)
    : IRequestHandler<RunRecurringRuleOnceCommand, ApiResponse<int>>
{
    public Task<ApiResponse<int>> Handle(RunRecurringRuleOnceCommand request, CancellationToken cancellationToken)
        => service.RunOnceAsync(request.UserId, request.RuleId, cancellationToken);
}
