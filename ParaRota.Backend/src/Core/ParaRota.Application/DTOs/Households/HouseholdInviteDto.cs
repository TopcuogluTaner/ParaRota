using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Households;

public class HouseholdInviteDto
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public InviteStatus Status { get; set; }
    public string InvitedByName { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
}
