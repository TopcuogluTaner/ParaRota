using FluentValidation;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Features.TransactionFeatures.Commands.CreateTransaction;

public sealed class CreateTransactionCommandValidator : AbstractValidator<CreateTransactionCommand>
{
    public CreateTransactionCommandValidator()
    {
        RuleFor(x => x.Dto.CategoryId).GreaterThan(0);

        RuleFor(x => x.Dto.Type)
            .IsInEnum()
            .Must(t => t == TransactionType.Income || t == TransactionType.Expense)
            .WithMessage("Tür Income veya Expense olmalı.");

        RuleFor(x => x.Dto.Nature).IsInEnum();
        RuleFor(x => x.Dto.Status).IsInEnum();
        RuleFor(x => x.Dto.PaidVia!.Value).IsInEnum().When(x => x.Dto.PaidVia.HasValue);

        RuleFor(x => x.Dto.Amount).GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");

        RuleFor(x => x.Dto.Currency)
            .NotEmpty()
            .Length(3)
            .Matches("^[A-Za-z]{3}$").WithMessage("Geçerli bir 3 harfli para birimi kodu gir (TRY/USD/EUR...).");

        RuleFor(x => x.Dto.TransactionDate).NotEmpty();

        RuleFor(x => x.Dto.Notes).MaximumLength(500);
        RuleFor(x => x.Dto.ReceiptUrl).MaximumLength(500);
    }
}
