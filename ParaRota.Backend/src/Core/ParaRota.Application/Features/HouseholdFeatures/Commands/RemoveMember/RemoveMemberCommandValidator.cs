using FluentValidation;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.RemoveMember;

public sealed class RemoveMemberCommandValidator : AbstractValidator<RemoveMemberCommand>
{
    public RemoveMemberCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.HouseholdId).GreaterThan(0);
        RuleFor(x => x.MemberUserId).GreaterThan(0);
    }
}
