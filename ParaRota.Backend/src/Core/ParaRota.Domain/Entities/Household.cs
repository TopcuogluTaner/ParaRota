using ParaRota.Domain.Abstractions;

namespace ParaRota.Domain.Entities;

public class Household : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public int OwnerUserId { get; set; }
    public AppUser Owner { get; set; } = null!;

    public string Currency { get; set; } = "TRY";

    public ICollection<HouseholdMember> Members { get; set; } = new List<HouseholdMember>();
    public ICollection<HouseholdInvite> Invites { get; set; } = new List<HouseholdInvite>();
}
