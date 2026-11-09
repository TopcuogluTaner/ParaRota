using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Goals;

public class CreateGoalDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Target { get; set; }
    public DateTime TargetDate { get; set; }
    public GoalPriority Priority { get; set; } = GoalPriority.Medium;
    public string? Emoji { get; set; }

    // Aile scope'u için opsiyonel — verilirse kullanıcı o household'ın aktif üyesi olmalı.
    public int? HouseholdId { get; set; }
}
