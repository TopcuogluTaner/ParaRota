using FluentValidation;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Commands.ApplyPayrollRaise;

public sealed class ApplyPayrollRaiseCommandValidator : AbstractValidator<ApplyPayrollRaiseCommand>
{
    public ApplyPayrollRaiseCommandValidator()
    {
        RuleFor(x => x.Dto.Gross).GreaterThan(0).WithMessage("Brüt maaş sıfırdan büyük olmalı.");
        RuleFor(x => x.Dto.EffectiveDate).NotEmpty();
    }
}
