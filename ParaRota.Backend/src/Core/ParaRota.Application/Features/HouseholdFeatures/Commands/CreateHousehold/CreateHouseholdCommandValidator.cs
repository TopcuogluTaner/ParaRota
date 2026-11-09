using FluentValidation;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.CreateHousehold;

public sealed class CreateHouseholdCommandValidator : AbstractValidator<CreateHouseholdCommand>
{
    public CreateHouseholdCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.Dto.Name).NotEmpty().MaximumLength(80);
        RuleFor(x => x.Dto.Currency).MaximumLength(3).When(x => !string.IsNullOrWhiteSpace(x.Dto.Currency));
    }
}
