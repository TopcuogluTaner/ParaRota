using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Commands.DeleteRecurringRule;

public sealed class DeleteRecurringRuleCommandHandler(IRecurringRuleService service)
    : IRequestHandler<DeleteRecurringRuleCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(DeleteRecurringRuleCommand request, CancellationToken cancellationToken)
        => service.DeleteAsync(request.UserId, request.Id, cancellationToken);
}
