using FluentValidation;

namespace ParaRota.Application.Features.NotificationFeatures.Commands.AdminDispatchNotification;

public sealed class AdminDispatchNotificationCommandValidator : AbstractValidator<AdminDispatchNotificationCommand>
{
    public AdminDispatchNotificationCommandValidator()
    {
        RuleFor(x => x.Body.Title)
            .NotEmpty().WithMessage("Başlık zorunlu.")
            .MaximumLength(100).WithMessage("Başlık en fazla 100 karakter.");

        RuleFor(x => x.Body.Message)
            .NotEmpty().WithMessage("Mesaj zorunlu.")
            .MaximumLength(500).WithMessage("Mesaj en fazla 500 karakter.");

        RuleFor(x => x.Body.TargetRole)
            .Must(r => string.IsNullOrEmpty(r) || r == "Admin" || r == "User")
            .WithMessage("Geçerli rol: Admin, User");

        RuleFor(x => x.Body.Severity)
            .IsInEnum().WithMessage("Geçersiz severity.");

        RuleFor(x => x.Body.Url)
            .MaximumLength(500).When(x => !string.IsNullOrEmpty(x.Body.Url))
            .WithMessage("Url en fazla 500 karakter.");

        RuleFor(x => x.Body)
            .Must(b => !(b.TargetUserId.HasValue && !string.IsNullOrEmpty(b.TargetRole)))
            .WithMessage("Hem TargetUserId hem TargetRole aynı anda set edilemez.");
    }
}
