using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Investments;

// Güncel kur panosu için tek satır: varlık + sınıfı + güncel (satış) fiyatı.
public class AssetRateDto
{
    public AssetType AssetType { get; set; }
    public AssetClass AssetClass { get; set; }

    // TEFAS fonunda fon kodu + adı (gösterim); diğer varlıklarda null.
    public string? FundCode { get; set; }
    public string? FundName { get; set; }

    public decimal? Sell { get; set; }
    public decimal? Buy { get; set; }
    public DateTime? AsOf { get; set; }
}
