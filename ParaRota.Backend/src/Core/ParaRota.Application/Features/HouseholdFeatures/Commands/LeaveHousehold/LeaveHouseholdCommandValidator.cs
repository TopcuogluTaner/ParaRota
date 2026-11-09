using FluentValidation;
using ParaRota.Application.DTOs.Households;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.LeaveHousehold;

public sealed class LeaveHouseholdCommandValidator : AbstractValidator<LeaveHouseholdCommand>
{
    public LeaveHouseholdCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.HouseholdId).GreaterThan(0);
        RuleFor(x => x.Dto.Mode).IsInEnum();
        // Transfer modunda TargetUserId zorunlu.
        RuleFor(x => x.Dto.TargetUserId)
            .NotNull().GreaterThan(0)
            .When(x => x.Dto.Mode == LeaveHouseholdMode.Transfer)
            .WithMessage("Transfer modunda hedef üye belirtilmeli.");
    }
}
