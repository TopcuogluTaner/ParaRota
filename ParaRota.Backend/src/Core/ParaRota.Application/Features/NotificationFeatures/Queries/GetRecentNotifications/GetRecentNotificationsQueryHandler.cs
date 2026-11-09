using MediatR;
using ParaRota.Application.DTOs.Notifications;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.NotificationFeatures.Queries.GetRecentNotifications;

public sealed class GetRecentNotificationsQueryHandler(INotificationService service)
    : IRequestHandler<GetRecentNotificationsQuery, ApiResponse<IReadOnlyList<NotificationDto>>>
{
    public Task<ApiResponse<IReadOnlyList<NotificationDto>>> Handle(GetRecentNotificationsQuery request, CancellationToken cancellationToken)
        => service.GetRecentAsync(request.UserId, request.Take, cancellationToken);
}
