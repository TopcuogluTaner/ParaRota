using FluentValidation;

namespace ParaRota.Application.Features.AuthFeatures.Commands.GoogleSignIn;

public sealed class GoogleSignInCommandValidator : AbstractValidator<GoogleSignInCommand>
{
    public GoogleSignInCommandValidator()
    {
        // Mobil id_token VEYA web authorization code — en az biri gerekli.
        RuleFor(x => x.Dto)
            .Must(d => !string.IsNullOrWhiteSpace(d.IdToken) || !string.IsNullOrWhiteSpace(d.Code))
            .WithMessage("idToken veya code gerekli.");
    }
}
