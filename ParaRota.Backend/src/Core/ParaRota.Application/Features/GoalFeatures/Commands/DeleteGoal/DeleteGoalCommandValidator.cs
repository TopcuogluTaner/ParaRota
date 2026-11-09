using FluentValidation;

namespace ParaRota.Application.Features.GoalFeatures.Commands.DeleteGoal;

public sealed class DeleteGoalCommandValidator : AbstractValidator<DeleteGoalCommand>
{
    public DeleteGoalCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.Id).GreaterThan(0);
    }
}
