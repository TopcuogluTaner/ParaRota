using FluentValidation;

namespace ParaRota.Application.Features.TransactionFeatures.Commands.MoveTransactionScope;

public sealed class MoveTransactionScopeCommandValidator : AbstractValidator<MoveTransactionScopeCommand>
{
    public MoveTransactionScopeCommandValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Dto.CategoryId).GreaterThan(0);
        RuleFor(x => x.Dto.TargetHouseholdId)
            .GreaterThan(0)
            .When(x => x.Dto.TargetHouseholdId.HasValue)
            .WithMessage("Geçerli bir aile id'si gir.");
    }
}
