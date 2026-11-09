using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.NotificationFeatures.Commands.MarkAllNotificationsRead;

public sealed class MarkAllNotificationsReadCommandHandler(INotificationService service)
    : IRequestHandler<MarkAllNotificationsReadCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(MarkAllNotificationsReadCommand request, CancellationToken cancellationToken)
        => service.MarkAllReadAsync(request.UserId, cancellationToken);
}
