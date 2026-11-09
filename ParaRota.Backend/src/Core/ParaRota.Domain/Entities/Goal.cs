using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

public class Goal : BaseEntity
{
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    // null = kişisel scope, dolu = aile scope. Kaydı yalnız sahibi (UserId) düzenler.
    public int? HouseholdId { get; set; }

    public string Name { get; set; } = string.Empty;

    // DTO'da `target` olarak gözükür.
    public decimal TargetAmount { get; set; }

    // DTO'da `current` olarak gözükür. Default 0.
    public decimal CurrentAmount { get; set; }

    public DateTime TargetDate { get; set; }

    public GoalPriority Priority { get; set; } = GoalPriority.Medium;
    public GoalStatus Status { get; set; } = GoalStatus.Active;

    public string? Emoji { get; set; }

    public string Currency { get; set; } = "TRY";
}
