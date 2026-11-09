namespace ParaRota.Application.Services;

/// <summary>
/// Anlık (online) push abstraction'ı — varsayılan SignalR ile pushlanır.
/// Kullanıcı bağlı değilse offline no-op davranır (transport seçimi).
/// </summary>
public interface IRealtimePusher
{
    Task PushToUserAsync(int userId, string eventName, object payload, CancellationToken cancellationToken = default);
}
