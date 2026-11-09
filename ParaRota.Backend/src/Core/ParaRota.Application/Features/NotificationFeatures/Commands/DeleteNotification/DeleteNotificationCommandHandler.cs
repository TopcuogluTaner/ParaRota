using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.NotificationFeatures.Commands.DeleteNotification;

public sealed class DeleteNotificationCommandHandler(INotificationService service)
    : IRequestHandler<DeleteNotificationCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(DeleteNotificationCommand request, CancellationToken cancellationToken)
        => service.DeleteAsync(request.UserId, request.Id, cancellationToken);
}
