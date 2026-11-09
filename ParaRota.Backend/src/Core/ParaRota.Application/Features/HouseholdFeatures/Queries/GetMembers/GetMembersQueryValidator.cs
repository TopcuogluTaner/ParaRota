using FluentValidation;

namespace ParaRota.Application.Features.HouseholdFeatures.Queries.GetMembers;

public sealed class GetMembersQueryValidator : AbstractValidator<GetMembersQuery>
{
    public GetMembersQueryValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.HouseholdId).GreaterThan(0);
    }
}
