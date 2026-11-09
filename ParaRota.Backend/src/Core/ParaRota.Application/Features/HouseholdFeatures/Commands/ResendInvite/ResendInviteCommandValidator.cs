using FluentValidation;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.ResendInvite;

public sealed class ResendInviteCommandValidator : AbstractValidator<ResendInviteCommand>
{
    public ResendInviteCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.HouseholdId).GreaterThan(0);
        RuleFor(x => x.InviteId).GreaterThan(0);
    }
}
