using FluentValidation;

namespace ParaRota.Application.Features.HouseholdFeatures.Queries.GetPendingInvites;

public sealed class GetPendingInvitesQueryValidator : AbstractValidator<GetPendingInvitesQuery>
{
    public GetPendingInvitesQueryValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.HouseholdId).GreaterThan(0);
    }
}
