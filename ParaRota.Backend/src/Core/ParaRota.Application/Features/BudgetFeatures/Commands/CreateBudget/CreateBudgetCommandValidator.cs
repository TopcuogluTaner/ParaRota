using FluentValidation;

namespace ParaRota.Application.Features.BudgetFeatures.Commands.CreateBudget;

public sealed class CreateBudgetCommandValidator : AbstractValidator<CreateBudgetCommand>
{
    public CreateBudgetCommandValidator()
    {
        RuleFor(x => x.Dto.CategoryId).GreaterThan(0);
        RuleFor(x => x.Dto.MonthlyLimit).GreaterThan(0).WithMessage("Bütçe limiti sıfırdan büyük olmalı.");
        RuleFor(x => x.Dto.Month).InclusiveBetween(1, 12);
        RuleFor(x => x.Dto.Year).InclusiveBetween(2000, 2100);
        RuleFor(x => x.Dto.WarnThreshold).InclusiveBetween(1, 100);
    }
}
