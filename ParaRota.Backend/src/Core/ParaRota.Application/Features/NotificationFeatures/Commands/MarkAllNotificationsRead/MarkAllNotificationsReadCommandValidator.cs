using FluentValidation;

namespace ParaRota.Application.Features.NotificationFeatures.Commands.MarkAllNotificationsRead;

public sealed class MarkAllNotificationsReadCommandValidator : AbstractValidator<MarkAllNotificationsReadCommand>
{
    public MarkAllNotificationsReadCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
    }
}
