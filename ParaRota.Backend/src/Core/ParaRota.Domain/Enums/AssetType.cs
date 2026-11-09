namespace ParaRota.Domain.Enums;

// Faz 6 — yatırım/portföy. Altın türleri + döviz. (Mevcut değerler korunur — eski kayıt bozulmasın.)
public enum AssetType
{
    GoldGram = 1, // Gram altın (TL/gr)
    Usd = 2,
    Eur = 3,
    Gbp = 4,
    // Faz 6.5 — ek döviz
    Chf = 5,
    Jpy = 6,
    Cad = 7,
    Aud = 8,
    Sar = 9,
    // Faz 6.5 — altın türleri (güncel: truncgil günlük; geçmiş: gram/Cumhuriyet resmi, diğerleri yaklaşık)
    GoldQuarter = 10,  // Çeyrek altın
    GoldHalf = 11,     // Yarım altın
    GoldFull = 12,     // Tam altın
    GoldRepublic = 13, // Cumhuriyet altını

    // Faz 7 — kripto (CoinGecko, TL güncel + tarihli)
    Btc = 20,
    Eth = 21,
    Usdt = 22,
    Bnb = 23,
    Sol = 24,
    Xrp = 25,
    Ada = 26,
    Doge = 27,
    Trx = 28,
    Avax = 29,
    Dot = 30,
    Link = 31,

    // Faz 7 — BIST hisseleri (Yahoo Finance .IS, TL)
    Thyao = 40,
    Garan = 41,
    Akbnk = 42,
    Asels = 43,
    Kchol = 44,
    Sise = 45,
    Eregl = 46,
    Bimas = 47,
    Tuprs = 48,
    Sahol = 49,
    Froto = 50,
    Tcell = 51,

    // TEFAS yatırım fonları (serbest fon kodu). Tek "işaret" değeri — hangi fon olduğu
    // FundCode alanında tutulur (800+ fon enum'a sığmaz). Fiyat: TEFAS public API.
    TefasFund = 60,
}
