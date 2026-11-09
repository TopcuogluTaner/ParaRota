using FluentValidation;

namespace ParaRota.Application.Features.HouseholdFeatures.Queries.GetHouseholdById;

public sealed class GetHouseholdByIdQueryValidator : AbstractValidator<GetHouseholdByIdQuery>
{
    public GetHouseholdByIdQueryValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.HouseholdId).GreaterThan(0);
    }
}
