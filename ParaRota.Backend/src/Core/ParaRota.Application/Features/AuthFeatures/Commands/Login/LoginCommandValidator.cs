using FluentValidation;

namespace ParaRota.Application.Features.AuthFeatures.Commands.Login;

public sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Dto.EmailOrUserName).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Dto.Password).NotEmpty().MaximumLength(100);
    }
}
