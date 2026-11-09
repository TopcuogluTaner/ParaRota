using FluentValidation;

namespace ParaRota.Application.Features.GoalFeatures.Commands.UpdateGoal;

public sealed class UpdateGoalCommandValidator : AbstractValidator<UpdateGoalCommand>
{
    public UpdateGoalCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Dto.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Dto.Target).GreaterThan(0).WithMessage("Hedef tutar sıfırdan büyük olmalı.");
        RuleFor(x => x.Dto.Current).GreaterThanOrEqualTo(0).WithMessage("Mevcut tutar negatif olamaz.");
        RuleFor(x => x.Dto.TargetDate).NotEmpty();
        RuleFor(x => x.Dto.Priority).IsInEnum();
        RuleFor(x => x.Dto.Status).IsInEnum();
        RuleFor(x => x.Dto.Emoji).MaximumLength(8).When(x => !string.IsNullOrEmpty(x.Dto.Emoji));
    }
}
