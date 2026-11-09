using ParaRota.Domain.Enums;

namespace ParaRota.Application.Services;

/// <summary>
/// Domain service'lerinin notification yaratmak için kullandığı orchestrator.
/// 1) DB persist (idempotent DedupKey ile)
/// 2) SignalR realtime push (online ise)
/// 3) FCM push (offline ise)
/// </summary>
public sealed record NotificationEnvelope(
    int UserId,
    NotificationType Type,
    NotificationSeverity Severity,
    string TitleKey,
    string MessageKey,
    string? Payload,
    string? RefType,
    int? RefId,
    string? DedupKey,
    // FCM/Push için interpolated metinler (kullanıcı diline göre caller hesaplar).
    string? PushTitle,
    string? PushBody);

public interface INotificationDispatcher
{
    /// <summary>Dönüş: bildirim yeni yaratılıp iletildiyse true; dedup hit'te false (push tekrarlanmaz).</summary>
    Task<bool> DispatchAsync(NotificationEnvelope envelope, CancellationToken cancellationToken = default);
}
