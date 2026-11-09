using FluentValidation;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Commands.CreateRecurringRule;

public sealed class CreateRecurringRuleCommandValidator : AbstractValidator<CreateRecurringRuleCommand>
{
    public CreateRecurringRuleCommandValidator()
    {
        RuleFor(x => x.Dto.Description).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Dto.CategoryId).GreaterThan(0);
        RuleFor(x => x.Dto.Type)
            .IsInEnum()
            .Must(t => t == TransactionType.Income || t == TransactionType.Expense);
        RuleFor(x => x.Dto.Nature).IsInEnum();
        RuleFor(x => x.Dto.Frequency).IsInEnum();
        RuleFor(x => x.Dto.Amount).GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
        RuleFor(x => x.Dto.PayrollGrossMonthly)
            .GreaterThan(0)
            .When(x => x.Dto.PayrollGrossMonthly.HasValue)
            .WithMessage("Brüt maaş sıfırdan büyük olmalı.");
        RuleFor(x => x.Dto.Currency).NotEmpty().Length(3).Matches("^[A-Za-z]{3}$");
        RuleFor(x => x.Dto.StartDate).NotEmpty();
        RuleFor(x => x.Dto.EndDate)
            .GreaterThan(x => x.Dto.StartDate)
            .When(x => x.Dto.EndDate.HasValue)
            .WithMessage("Bitiş tarihi başlangıçtan sonra olmalı.");
        RuleFor(x => x.Dto.Notes).MaximumLength(500);

        // Taksit planı kısıtları: aylık + gider; EndDate server hesaplar (client gönderemez).
        RuleFor(x => x.Dto.InstallmentCount)
            .InclusiveBetween(2, 120)
            .When(x => x.Dto.InstallmentCount.HasValue)
            .WithMessage("Taksit sayısı 2 ile 120 arasında olmalı.");
        RuleFor(x => x.Dto.InstallmentTotalAmount)
            .GreaterThan(0)
            .When(x => x.Dto.InstallmentTotalAmount.HasValue)
            .WithMessage("Toplam tutar sıfırdan büyük olmalı.");
        When(x => x.Dto.InstallmentCount.HasValue, () =>
        {
            RuleFor(x => x.Dto.Frequency)
                .Equal(RecurringFrequency.Monthly)
                .WithMessage("Taksit planı aylık olmalı.");
            RuleFor(x => x.Dto.Type)
                .Equal(TransactionType.Expense)
                .WithMessage("Taksit planı gider türünde olmalı.");
            RuleFor(x => x.Dto.EndDate)
                .Null()
                .WithMessage("Taksit planında bitiş tarihi gönderilmez; taksit sayısından hesaplanır.");
        });
        RuleFor(x => x.Dto.InstallmentTotalAmount)
            .Null()
            .When(x => !x.Dto.InstallmentCount.HasValue)
            .WithMessage("Toplam tutar yalnız taksit planında gönderilir.");
    }
}
