using ParaRota.Application.DTOs.Notifications;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Services;

public interface INotificationService
{
    Task<ApiResponse<IReadOnlyList<NotificationDto>>> GetRecentAsync(int userId, int take = 20, CancellationToken cancellationToken = default);
    Task<ApiResponse<int>> GetUnreadCountAsync(int userId, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> MarkReadAsync(int userId, int id, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> MarkAllReadAsync(int userId, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default);

    // Internal — diğer service'lerden çağrılır. Hata fırlatmaz; idempotency için sessizce no-op olabilir.
    // Dönüş: bildirim YENİ yazıldıysa true; dedup hit / hata durumunda false (caller realtime+push'u atlar).
    Task<bool> TryRaiseAsync(NotificationCreateInternal data, CancellationToken cancellationToken = default);
}

/// <summary>
/// Domain service'lerinin INotificationService.TryRaiseAsync üzerinden notification yaratırken
/// kullandığı internal payload. DedupKey verilirse aynı (UserId, DedupKey) varsa skip edilir.
/// </summary>
public sealed record NotificationCreateInternal(
    int UserId,
    NotificationType Type,
    NotificationSeverity Severity,
    string TitleKey,
    string MessageKey,
    string? Payload,
    string? RefType,
    int? RefId,
    string? DedupKey);
