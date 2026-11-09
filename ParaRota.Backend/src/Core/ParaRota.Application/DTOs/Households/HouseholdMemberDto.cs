using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Households;

public class HouseholdMemberDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public HouseholdMemberRole Role { get; set; }
    public HouseholdMemberStatus Status { get; set; }
    public DateTime JoinedAt { get; set; }
}
