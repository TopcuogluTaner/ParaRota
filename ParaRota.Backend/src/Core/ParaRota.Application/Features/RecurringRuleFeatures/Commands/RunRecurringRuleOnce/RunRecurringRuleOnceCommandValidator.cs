using FluentValidation;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Commands.RunRecurringRuleOnce;

public sealed class RunRecurringRuleOnceCommandValidator : AbstractValidator<RunRecurringRuleOnceCommand>
{
    public RunRecurringRuleOnceCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.RuleId).GreaterThan(0);
    }
}
