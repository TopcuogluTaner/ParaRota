using FluentValidation;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.TransferOwnership;

public sealed class TransferOwnershipCommandValidator : AbstractValidator<TransferOwnershipCommand>
{
    public TransferOwnershipCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.HouseholdId).GreaterThan(0);
        RuleFor(x => x.NewOwnerUserId).GreaterThan(0);
    }
}
