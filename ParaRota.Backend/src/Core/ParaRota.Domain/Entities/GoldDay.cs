using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

/// <summary>
/// Gün / Altın günü — dönüşümlü birikim grubu (ROSCA). Her toplantıda sıradaki üye ev sahibidir
/// ve diğerleri ona sabit bir katkı (altın/para) getirir. Bir tur sonunda herkes bir kez alır.
/// </summary>
public class GoldDay : BaseEntity
{
    // Kayıt sahibi (creator).
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    // null = kişisel scope; dolu = aile (v2). Kaydı yalnız sahibi (UserId) düzenler.
    public int? HouseholdId { get; set; }
    public Household? Household { get; set; }

    public string Name { get; set; } = string.Empty;

    public GoldDayType ContributionType { get; set; }

    /// <summary>Altın: "gram"/"ceyrek"/"yarim"/"tam"/"cumhuriyet". Para: "TRY"/"USD"/"EUR".</summary>
    public string ContributionUnit { get; set; } = string.Empty;

    /// <summary>Üye başına toplantı katkısı (ör. 1 çeyrek, 500 ₺).</summary>
    public decimal ContributionAmount { get; set; }

    public GoldDayFrequency Frequency { get; set; } = GoldDayFrequency.Monthly;

    public DateTime StartDate { get; set; }

    public GoldDayStatus Status { get; set; } = GoldDayStatus.Active;

    public ICollection<GoldDayMember> Members { get; set; } = new List<GoldDayMember>();
    public ICollection<GoldDayMeeting> Meetings { get; set; } = new List<GoldDayMeeting>();
}
