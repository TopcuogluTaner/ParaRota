using FluentValidation;

namespace ParaRota.Application.Features.AuthFeatures.Commands.ResendVerificationCode;

public sealed class ResendVerificationCodeCommandValidator : AbstractValidator<ResendVerificationCodeCommand>
{
    public ResendVerificationCodeCommandValidator()
    {
        RuleFor(x => x.Dto.Email).NotEmpty().EmailAddress();
    }
}
