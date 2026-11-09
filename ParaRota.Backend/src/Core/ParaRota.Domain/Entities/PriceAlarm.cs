using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

/// <summary>
/// Döviz/altın/kripto/hisse fiyat alarmı. Bir varlığın güncel TL fiyatı eşiği aşınca
/// (üstüne çıkınca / altına inince) bildirim gönderir. Tek seferlik — tetiklenince
/// Triggered olur, kullanıcı "yeniden kur" ile tekrar Active yapar.
/// </summary>
public class PriceAlarm : BaseEntity
{
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    // null = kişisel scope; dolu = aile (v2). Kaydı yalnız sahibi (UserId) düzenler.
    public int? HouseholdId { get; set; }
    public Household? Household { get; set; }

    public AssetType AssetType { get; set; }

    // TEFAS fonu ise fon kodu (ör. "AFA") + adı (gösterim). Diğer varlıklarda null.
    public string? FundCode { get; set; }
    public string? FundName { get; set; }

    public AlarmDirection Direction { get; set; }

    /// <summary>Eşik fiyat (TL).</summary>
    public decimal ThresholdPrice { get; set; }

    public AlarmStatus Status { get; set; } = AlarmStatus.Active;

    /// <summary>Son kontrolde okunan fiyat (gösterim için).</summary>
    public decimal? LastPrice { get; set; }
    public DateTime? LastCheckedAt { get; set; }

    /// <summary>Tetiklendiğindeki fiyat ve an.</summary>
    public decimal? TriggeredPrice { get; set; }
    public DateTime? TriggeredAt { get; set; }

    public string? Note { get; set; }
}
