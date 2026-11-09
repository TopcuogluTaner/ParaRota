using FluentValidation;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.UpdateHousehold;

public sealed class UpdateHouseholdCommandValidator : AbstractValidator<UpdateHouseholdCommand>
{
    public UpdateHouseholdCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.HouseholdId).GreaterThan(0);
        RuleFor(x => x.Dto.Name).NotEmpty().MaximumLength(80);
    }
}
