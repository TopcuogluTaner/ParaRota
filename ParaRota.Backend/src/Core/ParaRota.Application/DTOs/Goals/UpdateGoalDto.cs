using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Goals;

public class UpdateGoalDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Target { get; set; }
    public decimal Current { get; set; }
    public DateTime TargetDate { get; set; }
    public GoalPriority Priority { get; set; }
    public GoalStatus Status { get; set; }
    public string? Emoji { get; set; }
}
