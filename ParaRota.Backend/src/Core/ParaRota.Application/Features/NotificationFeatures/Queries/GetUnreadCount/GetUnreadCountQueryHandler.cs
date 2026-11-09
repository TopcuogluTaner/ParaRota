using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.NotificationFeatures.Queries.GetUnreadCount;

public sealed class GetUnreadCountQueryHandler(INotificationService service)
    : IRequestHandler<GetUnreadCountQuery, ApiResponse<int>>
{
    public Task<ApiResponse<int>> Handle(GetUnreadCountQuery request, CancellationToken cancellationToken)
        => service.GetUnreadCountAsync(request.UserId, cancellationToken);
}
