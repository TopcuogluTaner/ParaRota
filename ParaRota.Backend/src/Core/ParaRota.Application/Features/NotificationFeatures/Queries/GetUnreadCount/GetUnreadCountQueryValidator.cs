using FluentValidation;

namespace ParaRota.Application.Features.NotificationFeatures.Queries.GetUnreadCount;

public sealed class GetUnreadCountQueryValidator : AbstractValidator<GetUnreadCountQuery>
{
    public GetUnreadCountQueryValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
    }
}
