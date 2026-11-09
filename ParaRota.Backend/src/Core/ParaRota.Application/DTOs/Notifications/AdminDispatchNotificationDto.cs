using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Notifications;

/// <summary>
/// Admin tarafından manuel bildirim gönderirken kullanılan request body.
/// Target seçimi: TargetUserId set → tek kullanıcı; TargetRole set → role'deki
/// tüm kullanıcılar; ikisi de null → tüm aktif kullanıcılar (broadcast).
/// </summary>
public sealed class AdminDispatchNotificationDto
{
    public int? TargetUserId { get; set; }
    public string? TargetRole { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationSeverity Severity { get; set; } = NotificationSeverity.Info;

    /// <summary>Opsiyonel kaynak referansı (örn. deep link için url).</summary>
    public string? Url { get; set; }
}
