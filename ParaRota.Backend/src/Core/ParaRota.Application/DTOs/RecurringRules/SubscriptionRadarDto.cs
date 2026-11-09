using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.RecurringRules;

/// <summary>
/// Abonelik Radarı: sistem "Abonelikler" kategorisindeki gider kurallarının
/// (maaş ve taksit kuralları hariç) maliyet özeti + kural bazlı zam tespiti.
/// </summary>
public class SubscriptionRadarDto
{
    // Aylığa normalize toplamlar para birimi bazında — kur dönüşümü yapılmaz,
    // farklı para birimleri ayrı satır olarak döner (per-currency sözleşmesi).
    public List<SubscriptionRadarTotalDto> Totals { get; set; } = [];
    public int ActiveCount { get; set; }
    public int PausedCount { get; set; }
    public List<SubscriptionRadarItemDto> Items { get; set; } = [];
}

public class SubscriptionRadarTotalDto
{
    public string Currency { get; set; } = "TRY";
    public decimal MonthlyTotal { get; set; }
    public decimal YearlyTotal { get; set; }
}

public class SubscriptionRadarItemDto
{
    public int RuleId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";
    public RecurringFrequency Frequency { get; set; }
    public bool IsActive { get; set; }
    public DateTime NextRunDate { get; set; }

    // Kurala bağlı üretilmiş işlemlerden tespit edilen son tutar değişikliği (zam/indirim).
    public SubscriptionPriceChangeDto? PriceChange { get; set; }
}

public class SubscriptionPriceChangeDto
{
    public decimal PreviousAmount { get; set; }
    public decimal CurrentAmount { get; set; }
    public decimal Percent { get; set; }
    public DateTime ChangedAt { get; set; }
}
