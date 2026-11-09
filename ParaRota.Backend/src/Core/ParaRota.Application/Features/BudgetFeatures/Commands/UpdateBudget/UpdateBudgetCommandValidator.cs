using FluentValidation;

namespace ParaRota.Application.Features.BudgetFeatures.Commands.UpdateBudget;

public sealed class UpdateBudgetCommandValidator : AbstractValidator<UpdateBudgetCommand>
{
    public UpdateBudgetCommandValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Dto.MonthlyLimit).GreaterThan(0).WithMessage("Bütçe limiti sıfırdan büyük olmalı.");
        RuleFor(x => x.Dto.WarnThreshold).InclusiveBetween(1, 100);
    }
}
