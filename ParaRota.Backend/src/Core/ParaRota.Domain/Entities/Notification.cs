using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

public class Notification : BaseEntity
{
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    // Faz 2'de aile/household aktive olduğunda kullanılır.
    public int? HouseholdId { get; set; }

    public NotificationType Type { get; set; }
    public NotificationSeverity Severity { get; set; }

    // i18n key (örn. "notif.budget.exceeded.title")
    public string TitleKey { get; set; } = string.Empty;

    // i18n key (örn. "notif.budget.exceeded.body")
    public string MessageKey { get; set; } = string.Empty;

    // Mesaj interpolation için JSON serialized payload.
    // Örn: {"categoryName":"Market","overBy":18,"amount":1250}
    public string? Payload { get; set; }

    // Kaynak entity türü: "budget" / "recurring" / "goal"
    public string? RefType { get; set; }
    public int? RefId { get; set; }

    // Idempotency anahtarı. NULL ise unique constraint uygulanmaz.
    public string? DedupKey { get; set; }

    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
}
