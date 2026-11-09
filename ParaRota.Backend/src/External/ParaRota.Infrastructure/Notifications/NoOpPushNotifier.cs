using Microsoft.Extensions.Logging;
using ParaRota.Application.Services;

namespace ParaRota.Infrastructure.Notifications;

/// <summary>
/// FCM credentials henüz konfigüre edilmediği için no-op davranır.
/// Gelecekte FirebasePushNotifier (FirebaseAdmin) ile değiştirilebilir.
/// </summary>
public class NoOpPushNotifier(ILogger<NoOpPushNotifier> logger) : IPushNotifier
{
    public Task PushAsync(
        IReadOnlyList<string> deviceTokens,
        string title,
        string body,
        IDictionary<string, string>? data,
        CancellationToken cancellationToken = default)
    {
        logger.LogWarning(
            "[FCM] Push skipped — no credentials configured. Tokens={Count} Title={Title}",
            deviceTokens.Count,
            title);
        return Task.CompletedTask;
    }
}
