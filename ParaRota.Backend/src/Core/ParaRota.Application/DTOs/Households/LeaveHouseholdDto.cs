namespace ParaRota.Application.DTOs.Households;

public enum LeaveHouseholdMode
{
    Transfer = 1,
    Personal = 2,
    Delete = 3,
}

public class LeaveHouseholdDto
{
    public LeaveHouseholdMode Mode { get; set; }

    // Transfer modunda yeni owner olarak atanacak member'ın UserId'si.
    public int? TargetUserId { get; set; }
}
