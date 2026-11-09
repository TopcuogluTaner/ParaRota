using MediatR;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Commands.ApplyPayrollRaise;

public sealed class ApplyPayrollRaiseCommandHandler(IRecurringRuleService service)
    : IRequestHandler<ApplyPayrollRaiseCommand, ApiResponse<RecurringRuleDto>>
{
    public Task<ApiResponse<RecurringRuleDto>> Handle(ApplyPayrollRaiseCommand request, CancellationToken cancellationToken)
        => service.ApplyPayrollRaiseAsync(request.UserId, request.RuleId, request.Dto.Gross, request.Dto.EffectiveDate, cancellationToken);
}
