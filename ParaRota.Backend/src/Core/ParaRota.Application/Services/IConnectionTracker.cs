namespace ParaRota.Application.Services;

/// <summary>
/// Anlık kullanıcı bağlantı durumunu takip eder (SignalR Hub'tan beslenir).
/// Dispatcher offline ise FCM'e düşürmek için bunu sorar.
/// </summary>
public interface IConnectionTracker
{
    void TrackConnection(int userId, string connectionId);
    void UntrackConnection(int userId, string connectionId);
    bool IsUserOnline(int userId);
}
