using FluentValidation;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.CancelInvite;

public sealed class CancelInviteCommandValidator : AbstractValidator<CancelInviteCommand>
{
    public CancelInviteCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.HouseholdId).GreaterThan(0);
        RuleFor(x => x.InviteId).GreaterThan(0);
    }
}
