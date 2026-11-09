using FluentValidation;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.InviteToHousehold;

public sealed class InviteToHouseholdCommandValidator : AbstractValidator<InviteToHouseholdCommand>
{
    public InviteToHouseholdCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.HouseholdId).GreaterThan(0);
        RuleFor(x => x.Dto.Email).NotEmpty().EmailAddress().MaximumLength(255);
    }
}
