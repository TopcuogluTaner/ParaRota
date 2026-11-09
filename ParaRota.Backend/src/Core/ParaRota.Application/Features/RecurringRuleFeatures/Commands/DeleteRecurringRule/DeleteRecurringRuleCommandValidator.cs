using FluentValidation;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Commands.DeleteRecurringRule;

public sealed class DeleteRecurringRuleCommandValidator : AbstractValidator<DeleteRecurringRuleCommand>
{
    public DeleteRecurringRuleCommandValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
    }
}
