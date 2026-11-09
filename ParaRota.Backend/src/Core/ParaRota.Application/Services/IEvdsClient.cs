using ParaRota.Domain.Enums;

namespace ParaRota.Application.Services;

// TCMB EVDS3 düşük-seviye fetcher (HTTP). Impl: Infrastructure/MarketData/EvdsClient.
public interface IEvdsClient
{
    // Döviz (alış, satış) birim fiyatı belirli tarihte; o gün yoksa en yakın önceki iş günü.
    // (Birim normalizasyonu — ör. JPY/100 — impl içinde uygulanır.)
    Task<(decimal buy, decimal sell)?> GetFxAsync(AssetType asset, DateTime date, CancellationToken ct = default);

    // En güncel döviz (alış, satış).
    Task<(decimal buy, decimal sell)?> GetLatestFxAsync(AssetType asset, CancellationToken ct = default);

    // Resmi AYLIK altın (TL) — yalnız gram + Cumhuriyet için var; diğer altın türlerinde null.
    Task<decimal?> GetMonthlyGoldAsync(AssetType asset, DateTime month, CancellationToken ct = default);

    // En güncel yayınlanan aylık altın.
    Task<decimal?> GetLatestMonthlyGoldAsync(AssetType asset, CancellationToken ct = default);

    // Genel aylık seri: [start, end] aralığındaki tüm aylık değerler kronolojik sırada
    // (ör. TÜFE endeksi TP.FG.J0). Ağ/parse hatasında boş liste döner.
    Task<IReadOnlyList<(DateTime Month, decimal Value)>> GetMonthlySeriesAsync(string seriesCode, DateTime start, DateTime end, CancellationToken ct = default);
}
