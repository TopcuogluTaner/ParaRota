using FluentValidation;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.AcceptInvite;

public sealed class AcceptInviteCommandValidator : AbstractValidator<AcceptInviteCommand>
{
    public AcceptInviteCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.Dto.Token).NotEmpty().MaximumLength(64);
    }
}
