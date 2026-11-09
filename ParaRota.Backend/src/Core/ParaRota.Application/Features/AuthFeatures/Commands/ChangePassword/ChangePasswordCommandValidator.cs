using FluentValidation;

namespace ParaRota.Application.Features.AuthFeatures.Commands.ChangePassword;

public sealed class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.Dto.CurrentPassword).NotEmpty();
        RuleFor(x => x.Dto.NewPassword).NotEmpty().MinimumLength(8).MaximumLength(100);
    }
}
