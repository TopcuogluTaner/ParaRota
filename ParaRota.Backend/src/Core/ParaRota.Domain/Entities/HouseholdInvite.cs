using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

public class HouseholdInvite : BaseEntity
{
    public int HouseholdId { get; set; }
    public Household Household { get; set; } = null!;

    public string Email { get; set; } = string.Empty;

    public string Token { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public InviteStatus Status { get; set; } = InviteStatus.Pending;

    public int InvitedByUserId { get; set; }
}
