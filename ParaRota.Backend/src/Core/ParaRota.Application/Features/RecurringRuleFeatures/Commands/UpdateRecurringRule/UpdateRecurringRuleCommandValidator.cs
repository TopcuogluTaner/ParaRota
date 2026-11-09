using FluentValidation;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Commands.UpdateRecurringRule;

public sealed class UpdateRecurringRuleCommandValidator : AbstractValidator<UpdateRecurringRuleCommand>
{
    public UpdateRecurringRuleCommandValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Dto.Description).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Dto.CategoryId).GreaterThan(0);
        RuleFor(x => x.Dto.Nature).IsInEnum();
        RuleFor(x => x.Dto.Frequency).IsInEnum();
        RuleFor(x => x.Dto.Amount).GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
        RuleFor(x => x.Dto.Currency).NotEmpty().Length(3).Matches("^[A-Za-z]{3}$");
        RuleFor(x => x.Dto.StartDate).NotEmpty();
        RuleFor(x => x.Dto.EndDate)
            .GreaterThan(x => x.Dto.StartDate)
            .When(x => x.Dto.EndDate.HasValue)
            .WithMessage("Bitiş tarihi başlangıçtan sonra olmalı.");
        RuleFor(x => x.Dto.Notes).MaximumLength(500);
    }
}
