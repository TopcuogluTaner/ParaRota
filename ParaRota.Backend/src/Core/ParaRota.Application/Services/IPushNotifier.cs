namespace ParaRota.Application.Services;

/// <summary>
/// Offline (push notification) gönderim abstraction'ı — varsayılan FCM ile.
/// Şimdilik NoOp impl; ileride FirebasePushNotifier devreye alınabilir.
/// </summary>
public interface IPushNotifier
{
    Task PushAsync(
        IReadOnlyList<string> deviceTokens,
        string title,
        string body,
        IDictionary<string, string>? data,
        CancellationToken cancellationToken = default);
}
