using FluentValidation;

namespace ParaRota.Application.Features.GoalFeatures.Queries.GetGoalById;

public sealed class GetGoalByIdQueryValidator : AbstractValidator<GetGoalByIdQuery>
{
    public GetGoalByIdQueryValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.Id).GreaterThan(0);
    }
}
