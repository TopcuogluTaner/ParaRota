using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using ParaRota.Application.Services;

namespace ParaRota.WebApi.Hubs;

/// <summary>
/// SignalR hub'ı bildirim için. Multi-cihaz davranışı: bir kullanıcı birden fazla
/// cihazdan giriş yapabilir; her cihaz farklı ConnectionId açar ve aynı UserId'ye
/// IConnectionTracker tarafından map edilir. NotificationDispatcher
/// `hub.Clients.User(userId)` ile gönderdiğinde SignalR **tüm aktif bağlantılara**
/// (yani tüm cihazlara) push yapar. Per-cihaz scoping istenirse ileride
/// ConnectionId bazında filtre + DeviceTokenService'le entegrasyon gerekir.
/// </summary>
[Authorize]
public class NotificationsHub(IConnectionTracker tracker) : Hub
{
    public override Task OnConnectedAsync()
    {
        var userId = TryResolveUserId(Context.User);
        if (userId is not null)
        {
            tracker.TrackConnection(userId.Value, Context.ConnectionId);
        }
        return base.OnConnectedAsync();
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = TryResolveUserId(Context.User);
        if (userId is not null)
        {
            tracker.UntrackConnection(userId.Value, Context.ConnectionId);
        }
        return base.OnDisconnectedAsync(exception);
    }

    private static int? TryResolveUserId(ClaimsPrincipal? principal)
    {
        var raw = principal?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                  ?? principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(raw, out var id) ? id : null;
    }
}
