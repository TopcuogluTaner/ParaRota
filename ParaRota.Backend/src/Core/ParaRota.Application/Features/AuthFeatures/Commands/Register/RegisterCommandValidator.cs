using FluentValidation;

namespace ParaRota.Application.Features.AuthFeatures.Commands.Register;

public sealed class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public RegisterCommandValidator()
    {
        RuleFor(x => x.Dto.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Dto.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Dto.Email).NotEmpty().EmailAddress().MaximumLength(255);
        RuleFor(x => x.Dto.UserName).NotEmpty().MinimumLength(3).MaximumLength(50)
            .Matches(@"^[a-zA-Z0-9_.\-]+$").WithMessage("UserName harf, rakam, '_', '.', '-' içerebilir.");
        RuleFor(x => x.Dto.Password).NotEmpty().MinimumLength(8).MaximumLength(100);
    }
}
