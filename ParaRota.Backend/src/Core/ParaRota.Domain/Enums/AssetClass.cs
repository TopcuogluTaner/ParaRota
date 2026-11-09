namespace ParaRota.Domain.Enums;

// Varlık sınıfı — frontend kategorili seçici + fiyat kaynağı yönlendirmesi için.
public enum AssetClass
{
    Gold = 1,     // truncgil günlük + EVDS aylık
    Currency = 2, // EVDS günlük + geçmiş
    Crypto = 3,   // CoinGecko (TL, güncel + tarihli)
    Stock = 4,    // Yahoo Finance BIST .IS (TL)
    TefasFund = 5, // TEFAS yatırım fonu (serbest fon kodu, TL) — fiyat günde 1
}
