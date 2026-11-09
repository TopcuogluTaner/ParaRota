using FluentValidation;

namespace ParaRota.Application.Features.DebtFeatures.Commands.AddDebtPayment;

public sealed class AddDebtPaymentCommandValidator : AbstractValidator<AddDebtPaymentCommand>
{
    public AddDebtPaymentCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.DebtId).GreaterThan(0);

        RuleFor(x => x.Dto.Amount)
            .GreaterThan(0).WithMessage("Ödeme tutarı sıfırdan büyük olmalı.");

        RuleFor(x => x.Dto.PaymentDate)
            .NotEmpty()
            .Must(d => d.Date <= DateTime.Now.Date)
            .WithMessage("Ödeme tarihi bugünden ileri olamaz.");

        RuleFor(x => x.Dto.Notes)
            .MaximumLength(300)
            .When(x => !string.IsNullOrEmpty(x.Dto.Notes));
    }
}
