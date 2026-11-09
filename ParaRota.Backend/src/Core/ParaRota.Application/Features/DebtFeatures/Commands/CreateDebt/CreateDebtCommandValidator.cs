using FluentValidation;

namespace ParaRota.Application.Features.DebtFeatures.Commands.CreateDebt;

public sealed class CreateDebtCommandValidator : AbstractValidator<CreateDebtCommand>
{
    public CreateDebtCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);

        RuleFor(x => x.Dto.Title)
            .NotEmpty().WithMessage("Başlık zorunlu.")
            .MaximumLength(120);

        RuleFor(x => x.Dto.Description)
            .MaximumLength(500)
            .When(x => !string.IsNullOrEmpty(x.Dto.Description));

        RuleFor(x => x.Dto.CounterpartyName)
            .NotEmpty().WithMessage("Karşı taraf adı zorunlu.")
            .MaximumLength(120);

        RuleFor(x => x.Dto.Kind).IsInEnum();
        RuleFor(x => x.Dto.PaymentMode).IsInEnum();

        RuleFor(x => x.Dto.Amount)
            .GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");

        RuleFor(x => x.Dto.Currency)
            .NotEmpty().Length(3);

        RuleFor(x => x.Dto.InterestRate)
            .InclusiveBetween(0m, 100m)
            .When(x => x.Dto.InterestRate.HasValue);

        RuleFor(x => x.Dto.InstallmentCount)
            .GreaterThan(0)
            .When(x => x.Dto.InstallmentCount.HasValue);

        RuleFor(x => x.Dto.InstallmentFrequency)
            .IsInEnum()
            .When(x => x.Dto.InstallmentFrequency.HasValue);

        RuleFor(x => x.Dto.StartDate).NotEmpty();
    }
}
