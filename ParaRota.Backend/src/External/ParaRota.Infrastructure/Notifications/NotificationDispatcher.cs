using Microsoft.Extensions.Logging;
using ParaRota.Application.Services;

namespace ParaRota.Infrastructure.Notifications;

public class NotificationDispatcher(
    INotificationService notificationService,
    IRealtimePusher realtimePusher,
    IPushNotifier pushNotifier,
    IConnectionTracker connectionTracker,
    IDeviceTokenService deviceTokenService,
    ILogger<NotificationDispatcher> logger) : INotificationDispatcher
{
    public async Task<bool> DispatchAsync(NotificationEnvelope envelope, CancellationToken cancellationToken = default)
    {
        // 1) DB persist (idempotent DedupKey ile).
        var created = await notificationService.TryRaiseAsync(new NotificationCreateInternal(
            envelope.UserId,
            envelope.Type,
            envelope.Severity,
            envelope.TitleKey,
            envelope.MessageKey,
            envelope.Payload,
            envelope.RefType,
            envelope.RefId,
            envelope.DedupKey),
            cancellationToken);

        // Dedup hit (ya da persist hatası): kullanıcı bu bildirimi zaten aldı — job retry'ı,
        // manuel tetikleme veya restart sonrası ikinci koşu aynı push'u TEKRARLAMASIN.
        if (!created)
            return false;

        // 2) Realtime push — daima dene (offline ise no-op).
        try
        {
            await realtimePusher.PushToUserAsync(
                envelope.UserId,
                "notification",
                new
                {
                    type = envelope.Type,
                    severity = envelope.Severity,
                    titleKey = envelope.TitleKey,
                    messageKey = envelope.MessageKey,
                    payload = envelope.Payload,
                    refType = envelope.RefType,
                    refId = envelope.RefId,
                    createdAt = DateTime.Now,
                },
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Realtime push hata fırlatırsa bile dispatcher'ın akışını durdurma.
            logger.LogWarning(ex, "Realtime push failed for user {UserId}", envelope.UserId);
        }

        // 3) Kullanıcı online değilse FCM'e düş.
        if (!connectionTracker.IsUserOnline(envelope.UserId))
        {
            try
            {
                var tokens = await deviceTokenService.GetActiveTokensAsync(envelope.UserId, cancellationToken);
                if (tokens.Count > 0)
                {
                    await pushNotifier.PushAsync(
                        tokens,
                        envelope.PushTitle ?? "ParaRota",
                        envelope.PushBody ?? string.Empty,
                        null,
                        cancellationToken);
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Push notifier failed for user {UserId}", envelope.UserId);
            }
        }

        return true;
    }
}
