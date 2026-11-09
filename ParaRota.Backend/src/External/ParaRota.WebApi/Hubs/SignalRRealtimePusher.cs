using Microsoft.AspNetCore.SignalR;
using ParaRota.Application.Services;

namespace ParaRota.WebApi.Hubs;

public class SignalRRealtimePusher(IHubContext<NotificationsHub> hub) : IRealtimePusher
{
    public Task PushToUserAsync(int userId, string eventName, object payload, CancellationToken cancellationToken = default)
    {
        // Clients.User(userId) — IUserIdProvider, Context.UserIdentifier'ı user.Id'ye çevirdiği için bu çalışır.
        return hub.Clients.User(userId.ToString()).SendAsync(eventName, payload, cancellationToken);
    }
}
