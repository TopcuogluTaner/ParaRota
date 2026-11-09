using Hangfire;
using ParaRota.Application.DTOs.Investments;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Services;

// Piyasa verisi soyutlaması (çok kaynaklı): döviz = TCMB/EVDS günlük, gram altın =
// resmi aylık (EVDS) + günlük (3. parti). Implementasyon Infrastructure'da.
public interface IMarketDataService
{
    // Belirli bir tarihteki birim fiyat (alış günü için). Hafta sonu/tatil/eksikte
    // en yakın önceki veriye düşer. null = veri bulunamadı. fundCode yalnız TEFAS fonunda
    // dolu (hangi fon), diğer varlıklarda null.
    Task<decimal?> GetUnitPriceAsync(AssetType asset, string? fundCode, DateTime date, CancellationToken ct = default);

    // En güncel birim fiyat (değerleme için) — snapshot'tan okur, yoksa canlı çeker.
    Task<decimal?> GetSpotPriceAsync(AssetType asset, string? fundCode, CancellationToken ct = default);

    // Canlı güncel birim fiyat (snapshot'ı ATLAR) — taze fiyat gereken yerler için (fiyat alarmı).
    Task<decimal?> GetLiveSpotPriceAsync(AssetType asset, string? fundCode, CancellationToken ct = default);

    // TEFAS fon kodunu doğrular + güncel pay değeri ve resmi adını döner (ekleme formu için).
    // null = geçersiz/pasif kod ya da ulaşılamadı.
    Task<TefasFundQuote?> LookupTefasFundAsync(string fundCode, CancellationToken ct = default);

    // TEFAS fon kodu/adına göre arama (kullanıcı seçici için).
    Task<IReadOnlyList<TefasFundSummary>> SearchTefasFundsAsync(string query, CancellationToken ct = default);

    // TEFAS fonu için anlık snapshot yaz (ekleme anında — pano/değerlemede hemen görünsün).
    Task SaveTefasSnapshotAsync(string fundCode, decimal price, CancellationToken ct = default);

    // Günlük job: tüm varlıkların güncel fiyatını snapshot tablosuna yazar.
    // Yazılan/güncellenen snapshot sayısını döner.
    // Hangfire: aynı job'ın iki instance'ı çakışmasın (restart/uzun koşu senaryosu).
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    Task<int> RefreshSnapshotsAsync(CancellationToken ct = default);

    // Güncel kur panosu: tüm varlıkların en güncel snapshot fiyatı (sınıfıyla).
    Task<IReadOnlyList<AssetRateDto>> GetRatesAsync(CancellationToken ct = default);
}
