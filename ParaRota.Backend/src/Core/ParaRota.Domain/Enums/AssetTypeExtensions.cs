namespace ParaRota.Domain.Enums;

public static class AssetTypeExtensions
{
    // Altın türleri (truncgil günlük fiyat). Diğerleri döviz (EVDS).
    public static bool IsGold(this AssetType a) => a is AssetType.GoldGram
        or AssetType.GoldQuarter or AssetType.GoldHalf or AssetType.GoldFull or AssetType.GoldRepublic;

    public static bool IsCrypto(this AssetType a) => (int)a is >= 20 and <= 39;

    public static bool IsStock(this AssetType a) => (int)a is >= 40 and <= 59;

    // TEFAS fonu — somut fon kodu ayrı (FundCode) tutulur; bu yalnız sınıf işareti.
    public static bool IsTefas(this AssetType a) => a == AssetType.TefasFund;

    public static AssetClass Class(this AssetType a)
    {
        if (a.IsGold()) return AssetClass.Gold;
        if (a.IsCrypto()) return AssetClass.Crypto;
        if (a.IsStock()) return AssetClass.Stock;
        if (a.IsTefas()) return AssetClass.TefasFund;
        return AssetClass.Currency;
    }
}
