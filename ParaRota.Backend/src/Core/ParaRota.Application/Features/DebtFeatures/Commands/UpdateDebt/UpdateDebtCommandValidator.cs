using FluentValidation;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Features.DebtFeatures.Commands.UpdateDebt;

public sealed class UpdateDebtCommandValidator : AbstractValidator<UpdateDebtCommand>
{
    public UpdateDebtCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.DebtId).GreaterThan(0);

        RuleFor(x => x.Dto.Title)
            .NotEmpty().WithMessage("Başlık zorunlu.")
            .MaximumLength(120);

        RuleFor(x => x.Dto.Description)
            .MaximumLength(500)
            .When(x => !string.IsNullOrEmpty(x.Dto.Description));

        RuleFor(x => x.Dto.CounterpartyName)
            .NotEmpty().WithMessage("Karşı taraf adı zorunlu.")
            .MaximumLength(120);

        RuleFor(x => x.Dto.InterestRate)
            .InclusiveBetween(0m, 100m)
            .When(x => x.Dto.InterestRate.HasValue);

        // Update üzerinden yalnızca Active ↔ Cancelled geçişine izin verilir.
        RuleFor(x => x.Dto.Status)
            .Must(s => s == DebtStatus.Active || s == DebtStatus.Cancelled)
            .WithMessage("Bu işlemde sadece Active veya Cancelled atanabilir.");
    }
}
