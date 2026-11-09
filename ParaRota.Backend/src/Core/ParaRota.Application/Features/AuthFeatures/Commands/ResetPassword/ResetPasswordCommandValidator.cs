using FluentValidation;

namespace ParaRota.Application.Features.AuthFeatures.Commands.ResetPassword;

public sealed class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordCommandValidator()
    {
        RuleFor(x => x.Dto.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Dto.Code).NotEmpty().Length(6).Matches(@"^\d{6}$")
            .WithMessage("Sıfırlama kodu 6 haneli rakam olmalıdır.");
        RuleFor(x => x.Dto.NewPassword).NotEmpty().MinimumLength(8).MaximumLength(100);
    }
}
