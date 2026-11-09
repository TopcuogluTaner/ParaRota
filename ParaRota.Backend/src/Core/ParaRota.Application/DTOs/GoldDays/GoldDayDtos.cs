using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.GoldDays;

// ── Girdi ──────────────────────────────────────────────────────────────────
public class CreateGoldDayDto
{
    public string Name { get; set; } = string.Empty;
    public GoldDayType ContributionType { get; set; }
    /// <summary>Altın: gram/ceyrek/yarim/tam/cumhuriyet. Para: TRY/USD/EUR.</summary>
    public string ContributionUnit { get; set; } = string.Empty;
    public decimal ContributionAmount { get; set; }
    public GoldDayFrequency Frequency { get; set; } = GoldDayFrequency.Monthly;
    public DateTime StartDate { get; set; }
    /// <summary>Üyeler, ev sahipliği sırasıyla (listedeki sıra = Order).</summary>
    public List<GoldDayMemberInputDto> Members { get; set; } = [];
}

public class GoldDayMemberInputDto
{
    public string Name { get; set; } = string.Empty;
    public bool IsSelf { get; set; }
}

public class UpdateGoldDayDto
{
    public string Name { get; set; } = string.Empty;
}

public class SetContributionPaidDto
{
    public bool IsPaid { get; set; }
}

public class SetMeetingCompletedDto
{
    public bool IsCompleted { get; set; }
}

// ── Çıktı ──────────────────────────────────────────────────────────────────
public class GoldDayListItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public GoldDayType ContributionType { get; set; }
    public string ContributionUnit { get; set; } = string.Empty;
    public decimal ContributionAmount { get; set; }
    public GoldDayStatus Status { get; set; }
    public int MemberCount { get; set; }
    public DateTime? NextMeetingDate { get; set; }
    public string? NextHostName { get; set; }
    public int CompletedMeetings { get; set; }
    /// <summary>Bir toplantı kasasının bugünkü TL değeri (altın → fiyat; TRY → kendisi; diğer döviz → null).</summary>
    public decimal? PotValueTry { get; set; }
}

public class GoldDayMemberDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; }
    public bool IsSelf { get; set; }
}

public class GoldDayContributionDto
{
    public int Id { get; set; }
    public int MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public bool IsPaid { get; set; }
    public DateTime? PaidDate { get; set; }
}

public class GoldDayMeetingDto
{
    public int Id { get; set; }
    public int SequenceNo { get; set; }
    public DateTime MeetingDate { get; set; }
    public int HostMemberId { get; set; }
    public string HostName { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public int PaidCount { get; set; }
    public int ContributionCount { get; set; }
    public List<GoldDayContributionDto> Contributions { get; set; } = [];
}

public class GoldDayDetailDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public GoldDayType ContributionType { get; set; }
    public string ContributionUnit { get; set; } = string.Empty;
    public decimal ContributionAmount { get; set; }
    public GoldDayFrequency Frequency { get; set; }
    public DateTime StartDate { get; set; }
    public GoldDayStatus Status { get; set; }

    /// <summary>Bir toplantıdaki toplam katkı (birim cinsinden) = (üye−1) × katkı.</summary>
    public decimal PotUnits { get; set; }
    /// <summary>Altın için birim başına güncel TL fiyatı; değilse null.</summary>
    public decimal? UnitPriceTry { get; set; }
    /// <summary>Bir toplantı kasasının bugünkü TL değeri; hesaplanamıyorsa null.</summary>
    public decimal? PotValueTry { get; set; }

    /// <summary>Sıradaki (tamamlanmamış) toplantı id'si; yoksa null.</summary>
    public int? CurrentMeetingId { get; set; }

    public List<GoldDayMemberDto> Members { get; set; } = [];
    public List<GoldDayMeetingDto> Meetings { get; set; } = [];
}
