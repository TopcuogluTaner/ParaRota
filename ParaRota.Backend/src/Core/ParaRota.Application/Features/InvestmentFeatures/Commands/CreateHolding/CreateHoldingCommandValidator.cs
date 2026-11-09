using FluentValidation;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Features.InvestmentFeatures.Commands.CreateHolding;

public sealed class CreateHoldingCommandValidator : AbstractValidator<CreateHoldingCommand>
{
    public CreateHoldingCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.Dto.AssetType).IsInEnum();
        RuleFor(x => x.Dto.PurchaseDate).NotEmpty();
        RuleFor(x => x.Dto)
            .Must(d => d.Quantity is > 0m || d.InvestedAmount is > 0m)
            .WithMessage("Tutar ya da adet/gram girilmeli.");
        RuleFor(x => x.Dto.Note).MaximumLength(280).When(x => !string.IsNullOrEmpty(x.Dto.Note));
        // TEFAS fonu: fon kodu zorunlu (geçerliliği serviste TEFAS API ile doğrulanır).
        RuleFor(x => x.Dto.FundCode)
            .NotEmpty().WithMessage("Fon kodu girilmeli.")
            .MaximumLength(10)
            .When(x => x.Dto.AssetType == AssetType.TefasFund);
    }
}
