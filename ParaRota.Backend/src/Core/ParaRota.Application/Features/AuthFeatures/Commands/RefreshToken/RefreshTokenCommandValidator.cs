using FluentValidation;

namespace ParaRota.Application.Features.AuthFeatures.Commands.RefreshToken;

public sealed class RefreshTokenCommandValidator : AbstractValidator<RefreshTokenCommand>
{
    public RefreshTokenCommandValidator()
    {
        RuleFor(x => x.Dto.RefreshToken).NotEmpty();
    }
}
