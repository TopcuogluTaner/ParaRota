using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Goals;

public class GoalDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    // Entity TargetAmount -> Target
    public decimal Target { get; set; }

    // Entity CurrentAmount -> Current
    public decimal Current { get; set; }

    public DateTime TargetDate { get; set; }
    public GoalPriority Priority { get; set; }
    public GoalStatus Status { get; set; }
    public string? Emoji { get; set; }
}
