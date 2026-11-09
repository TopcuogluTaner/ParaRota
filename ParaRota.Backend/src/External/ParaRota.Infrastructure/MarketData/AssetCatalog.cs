using ParaRota.Domain.Enums;

namespace ParaRota.Infrastructure.MarketData;

// Varlık → kaynak eşlemesi. Döviz = EVDS (günlük + geçmiş). Altın = truncgil (günlük)
// + EVDS resmi aylık (gram/Cumhuriyet için geçmiş). (Spike'ta doğrulandı: evds3/igmevdsms-dis.)
internal static class AssetCatalog
{
    public static bool IsGold(AssetType a) => a is AssetType.GoldGram or AssetType.GoldQuarter
        or AssetType.GoldHalf or AssetType.GoldFull or AssetType.GoldRepublic;

    // Döviz: alış .A.YTL, satış .S.YTL (günlük + geçmiş).
    public static (string buy, string sell)? FxSeries(AssetType asset) => asset switch
    {
        AssetType.Usd => ("TP.DK.USD.A.YTL", "TP.DK.USD.S.YTL"),
        AssetType.Eur => ("TP.DK.EUR.A.YTL", "TP.DK.EUR.S.YTL"),
        AssetType.Gbp => ("TP.DK.GBP.A.YTL", "TP.DK.GBP.S.YTL"),
        AssetType.Chf => ("TP.DK.CHF.A.YTL", "TP.DK.CHF.S.YTL"),
        AssetType.Jpy => ("TP.DK.JPY.A.YTL", "TP.DK.JPY.S.YTL"),
        AssetType.Cad => ("TP.DK.CAD.A.YTL", "TP.DK.CAD.S.YTL"),
        AssetType.Aud => ("TP.DK.AUD.A.YTL", "TP.DK.AUD.S.YTL"),
        AssetType.Sar => ("TP.DK.SAR.A.YTL", "TP.DK.SAR.S.YTL"),
        _ => null,
    };

    // TCMB bazı dövizleri birim başına değil 100 birim üzerinden kotalar (ör. JPY).
    // 1 birim fiyatına indirmek için bölen.
    public static decimal FxUnitDivisor(AssetType asset) => asset switch
    {
        AssetType.Jpy => 100m,
        _ => 1m,
    };

    // Altın günlük (truncgil today.json anahtarı).
    public static string? GoldTruncgilKey(AssetType asset) => asset switch
    {
        AssetType.GoldGram => "gram-altin",
        AssetType.GoldQuarter => "ceyrek-altin",
        AssetType.GoldHalf => "yarim-altin",
        AssetType.GoldFull => "tam-altin",
        AssetType.GoldRepublic => "cumhuriyet-altini",
        _ => null,
    };

    // Altın geçmiş (resmi aylık EVDS) — yalnız gram + Cumhuriyet için var; diğerleri null (güncele düşülür).
    public static string? GoldMonthlySeries(AssetType asset) => asset switch
    {
        AssetType.GoldGram => "TP.MK.KUL.YTL",
        AssetType.GoldRepublic => "TP.MK.CUM.YTL",
        _ => null,
    };

    // Kripto → CoinGecko coin id (TL güncel + tarihli).
    public static string? CoinGeckoId(AssetType asset) => asset switch
    {
        AssetType.Btc => "bitcoin",
        AssetType.Eth => "ethereum",
        AssetType.Usdt => "tether",
        AssetType.Bnb => "binancecoin",
        AssetType.Sol => "solana",
        AssetType.Xrp => "ripple",
        AssetType.Ada => "cardano",
        AssetType.Doge => "dogecoin",
        AssetType.Trx => "tron",
        AssetType.Avax => "avalanche-2",
        AssetType.Dot => "polkadot",
        AssetType.Link => "chainlink",
        _ => null,
    };

    // BIST hisse → Yahoo Finance sembolü (.IS, TL bazlı).
    public static string? YahooSymbol(AssetType asset) => asset switch
    {
        AssetType.Thyao => "THYAO.IS",
        AssetType.Garan => "GARAN.IS",
        AssetType.Akbnk => "AKBNK.IS",
        AssetType.Asels => "ASELS.IS",
        AssetType.Kchol => "KCHOL.IS",
        AssetType.Sise => "SISE.IS",
        AssetType.Eregl => "EREGL.IS",
        AssetType.Bimas => "BIMAS.IS",
        AssetType.Tuprs => "TUPRS.IS",
        AssetType.Sahol => "SAHOL.IS",
        AssetType.Froto => "FROTO.IS",
        AssetType.Tcell => "TCELL.IS",
        _ => null,
    };
}
