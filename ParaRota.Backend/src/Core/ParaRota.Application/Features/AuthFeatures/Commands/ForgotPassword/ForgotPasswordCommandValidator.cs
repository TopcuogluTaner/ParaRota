using FluentValidation;

namespace ParaRota.Application.Features.AuthFeatures.Commands.ForgotPassword;

public sealed class ForgotPasswordCommandValidator : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordCommandValidator()
    {
        RuleFor(x => x.Dto.Email).NotEmpty().EmailAddress();
    }
}
