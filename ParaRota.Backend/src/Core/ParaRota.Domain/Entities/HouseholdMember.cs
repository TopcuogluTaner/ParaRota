using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

public class HouseholdMember : BaseEntity
{
    public int HouseholdId { get; set; }
    public Household Household { get; set; } = null!;

    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public HouseholdMemberRole Role { get; set; } = HouseholdMemberRole.Member;
    public HouseholdMemberStatus Status { get; set; } = HouseholdMemberStatus.Active;

    public DateTime JoinedAt { get; set; }

    public int? InvitedByUserId { get; set; }
}
