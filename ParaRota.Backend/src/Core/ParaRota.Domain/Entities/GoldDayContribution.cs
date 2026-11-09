using ParaRota.Domain.Abstractions;

namespace ParaRota.Domain.Entities;

/// <summary>Bir toplantıda bir üyenin katkısı (ev sahibi hariç herkes katkı verir).</summary>
public class GoldDayContribution : BaseEntity
{
    public int MeetingId { get; set; }
    public GoldDayMeeting Meeting { get; set; } = null!;

    public int MemberId { get; set; }
    public GoldDayMember Member { get; set; } = null!;

    public bool IsPaid { get; set; }
    public DateTime? PaidDate { get; set; }
}
