using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

// Kur/fiyat arşivi (cache). Günlük job yazar; değerleme en güncel snapshot'tan okur.
// Geçmiş alış günü için tarihe en yakın/önceki snapshot ya da market'ten tarihli sorgu.
public class AssetPriceSnapshot : BaseEntity
{
    public AssetType AssetType { get; set; }

    // TEFAS fonu snapshot'ında fon kodu (ör. "AFA"); diğer varlıklarda null.
    // Anahtar (AssetType, FundCode, AsOf, Source) tek fonu benzersiz kılar.
    public string? FundCode { get; set; }

    // Fiyatın ait olduğu an (günlük çekimde gün; resmi aylık altında ayın ilk günü).
    public DateTime AsOf { get; set; }

    public decimal BuyPrice { get; set; }
    public decimal SellPrice { get; set; }

    // Kaynak: "EVDS" (resmi döviz/aylık altın) | "Truncgil" (günlük altın) | "TCMB-XML"
    public string Source { get; set; } = string.Empty;
}
