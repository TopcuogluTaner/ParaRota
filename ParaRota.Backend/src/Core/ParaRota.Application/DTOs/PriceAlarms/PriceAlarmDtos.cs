using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.PriceAlarms;

public class CreatePriceAlarmDto
{
    public AssetType AssetType { get; set; }

    // AssetType == TefasFund iken zorunlu: TEFAS fon kodu (ör. "AFA").
    public string? FundCode { get; set; }

    public AlarmDirection Direction { get; set; }
    public decimal ThresholdPrice { get; set; }
    public string? Note { get; set; }
}

public class UpdatePriceAlarmDto
{
    public AlarmDirection Direction { get; set; }
    public decimal ThresholdPrice { get; set; }
    public string? Note { get; set; }
}

public class PriceAlarmDto
{
    public int Id { get; set; }
    public AssetType AssetType { get; set; }

    // TEFAS fonunda fon kodu + adı (gösterim); diğer varlıklarda null.
    public string? FundCode { get; set; }
    public string? FundName { get; set; }

    public AlarmDirection Direction { get; set; }
    public decimal ThresholdPrice { get; set; }
    public AlarmStatus Status { get; set; }
    public decimal? LastPrice { get; set; }
    public DateTime? LastCheckedAt { get; set; }
    public decimal? TriggeredPrice { get; set; }
    public DateTime? TriggeredAt { get; set; }
    public string? Note { get; set; }
    /// <summary>Varlığın güncel TL fiyatı (snapshot) — eşiğe ne kadar yakın gösterimi için.</summary>
    public decimal? CurrentPrice { get; set; }
    public DateTime CreatedDate { get; set; }
}
