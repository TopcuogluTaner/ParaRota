using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.NotificationFeatures.Commands.MarkNotificationRead;

public sealed class MarkNotificationReadCommandHandler(INotificationService service)
    : IRequestHandler<MarkNotificationReadCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(MarkNotificationReadCommand request, CancellationToken cancellationToken)
        => service.MarkReadAsync(request.UserId, request.Id, cancellationToken);
}
