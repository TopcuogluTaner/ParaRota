using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Notifications;

public class NotificationDto
{
    public int Id { get; set; }
    public NotificationType Type { get; set; }
    public NotificationSeverity Severity { get; set; }
    public string TitleKey { get; set; } = string.Empty;
    public string MessageKey { get; set; } = string.Empty;
    public string? Payload { get; set; }
    public string? RefType { get; set; }
    public int? RefId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedDate { get; set; }
}
