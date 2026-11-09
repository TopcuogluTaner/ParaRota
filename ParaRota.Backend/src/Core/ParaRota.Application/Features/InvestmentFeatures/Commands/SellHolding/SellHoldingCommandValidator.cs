using FluentValidation;

namespace ParaRota.Application.Features.InvestmentFeatures.Commands.SellHolding;

public sealed class SellHoldingCommandValidator : AbstractValidator<SellHoldingCommand>
{
    public SellHoldingCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Dto.SaleDate).NotEmpty();
        RuleFor(x => x.Dto.Quantity).GreaterThan(0m).When(x => x.Dto.Quantity.HasValue);
    }
}
