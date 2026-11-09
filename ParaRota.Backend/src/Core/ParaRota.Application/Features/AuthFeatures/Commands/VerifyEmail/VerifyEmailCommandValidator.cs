using FluentValidation;

namespace ParaRota.Application.Features.AuthFeatures.Commands.VerifyEmail;

public sealed class VerifyEmailCommandValidator : AbstractValidator<VerifyEmailCommand>
{
    public VerifyEmailCommandValidator()
    {
        RuleFor(x => x.Dto.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Dto.Code).NotEmpty().Length(6).Matches(@"^\d{6}$")
            .WithMessage("Doğrulama kodu 6 haneli rakam olmalıdır.");
    }
}
