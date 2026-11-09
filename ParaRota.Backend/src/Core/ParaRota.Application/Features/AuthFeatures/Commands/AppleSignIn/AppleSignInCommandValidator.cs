using FluentValidation;

namespace ParaRota.Application.Features.AuthFeatures.Commands.AppleSignIn;

public sealed class AppleSignInCommandValidator : AbstractValidator<AppleSignInCommand>
{
    public AppleSignInCommandValidator()
    {
        RuleFor(x => x.Dto.IdentityToken).NotEmpty();
    }
}
