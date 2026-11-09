using FluentValidation;

namespace ParaRota.Application.Features.NotificationFeatures.Queries.GetRecentNotifications;

public sealed class GetRecentNotificationsQueryValidator : AbstractValidator<GetRecentNotificationsQuery>
{
    public GetRecentNotificationsQueryValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.Take).InclusiveBetween(1, 100);
    }
}
