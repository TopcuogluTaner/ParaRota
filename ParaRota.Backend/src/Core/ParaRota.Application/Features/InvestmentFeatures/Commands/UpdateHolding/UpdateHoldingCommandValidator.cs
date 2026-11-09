using FluentValidation;

namespace ParaRota.Application.Features.InvestmentFeatures.Commands.UpdateHolding;

public sealed class UpdateHoldingCommandValidator : AbstractValidator<UpdateHoldingCommand>
{
    public UpdateHoldingCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Dto.PurchaseDate).NotEmpty();
        RuleFor(x => x.Dto)
            .Must(d => d.Quantity is > 0m || d.InvestedAmount is > 0m)
            .WithMessage("Tutar ya da adet/gram girilmeli.");
        RuleFor(x => x.Dto.Note).MaximumLength(280).When(x => !string.IsNullOrEmpty(x.Dto.Note));
    }
}
