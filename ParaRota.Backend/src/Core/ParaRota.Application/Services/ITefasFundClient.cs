namespace ParaRota.Application.Services;

// TEFAS yatırım fonu fiyat kaynağı (public API, anahtarsız, TL). Fonlar günde 1 fiyatlanır.
// Impl: Infrastructure/MarketData/TefasFundClient.
public interface ITefasFundClient
{
    // Fon kodunun güncel (son yayınlanan) pay değeri + resmi adı + tarihi.
    // null = geçersiz/pasif fon kodu ya da ulaşılamadı. Ekleme anında doğrulama için de kullanılır.
    Task<TefasFundQuote?> GetCurrentAsync(string fundCode, CancellationToken ct = default);

    // Belirli tarihteki pay değeri (geçmiş alış için) — tarihe en yakın önceki iş günü.
    // TEFAS yalnız son ~5 yılı verir; daha eski tarih ya da ulaşılamazsa null.
    Task<decimal?> GetHistoricalAsync(string fundCode, DateTime date, CancellationToken ct = default);

    // Fon kodu/adına göre arama (kullanıcı seçici için). Tüm fon listesi süreç-içi
    // cache'lenir (günde ~1 TEFAS çağrısı), filtre yerelde yapılır → throttle dostu.
    Task<IReadOnlyList<TefasFundSummary>> SearchAsync(string query, int limit, CancellationToken ct = default);
}

// TEFAS fon kotasyonu: pay değeri + resmi ad + fiyat tarihi.
public sealed record TefasFundQuote(string Code, string Name, decimal Price, DateTime AsOf);

// Arama sonucu satırı: fon kodu + resmi ad + güncel pay değeri.
public sealed record TefasFundSummary(string Code, string Name, decimal Price);
