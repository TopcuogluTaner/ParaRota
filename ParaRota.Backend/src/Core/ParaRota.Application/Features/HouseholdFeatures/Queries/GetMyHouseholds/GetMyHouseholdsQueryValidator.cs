using FluentValidation;

namespace ParaRota.Application.Features.HouseholdFeatures.Queries.GetMyHouseholds;

public sealed class GetMyHouseholdsQueryValidator : AbstractValidator<GetMyHouseholdsQuery>
{
    public GetMyHouseholdsQueryValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
    }
}
