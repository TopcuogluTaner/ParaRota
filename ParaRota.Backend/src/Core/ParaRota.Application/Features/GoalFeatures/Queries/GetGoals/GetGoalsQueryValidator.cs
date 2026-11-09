using FluentValidation;

namespace ParaRota.Application.Features.GoalFeatures.Queries.GetGoals;

public sealed class GetGoalsQueryValidator : AbstractValidator<GetGoalsQuery>
{
    public GetGoalsQueryValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
    }
}
