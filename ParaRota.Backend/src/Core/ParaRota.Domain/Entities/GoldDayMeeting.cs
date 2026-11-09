using ParaRota.Domain.Abstractions;

namespace ParaRota.Domain.Entities;

/// <summary>Gün toplantısı (bir tur) — sıradaki ev sahibi kasayı alır.</summary>
public class GoldDayMeeting : BaseEntity
{
    public int GoldDayId { get; set; }
    public GoldDay GoldDay { get; set; } = null!;

    public int SequenceNo { get; set; }

    public DateTime MeetingDate { get; set; }

    /// <summary>Bu toplantının ev sahibi (kasayı alan üye).</summary>
    public int HostMemberId { get; set; }
    public GoldDayMember HostMember { get; set; } = null!;

    /// <summary>Toplantı yapıldı + kasa teslim edildi.</summary>
    public bool IsCompleted { get; set; }

    /// <summary>Hangfire hatırlatması spam guard'ı (aynı toplantı için günde 1 bildirim).</summary>
    public DateTime? LastReminderSentDate { get; set; }

    public ICollection<GoldDayContribution> Contributions { get; set; } = new List<GoldDayContribution>();
}
