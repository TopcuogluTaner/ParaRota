using FluentValidation;

namespace ParaRota.Application.Features.AuthFeatures.Commands.SetAvatar;

public sealed class SetAvatarCommandValidator : AbstractValidator<SetAvatarCommand>
{
    // "ikonAdı|#RRGGBB" — ikon adı MDI kebab-case (harf/rakam/tire), renk 6 haneli hex.
    private const string AvatarPattern = @"^[a-z0-9-]{1,40}\|#[0-9A-Fa-f]{6}$";

    public SetAvatarCommandValidator()
    {
        RuleFor(x => x.Avatar)
            .Matches(AvatarPattern)
            .When(x => !string.IsNullOrWhiteSpace(x.Avatar))
            .WithMessage("Avatar 'ikon|#RRGGBB' biçiminde olmalı.");
    }
}
