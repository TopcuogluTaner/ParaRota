using ParaRota.Domain.Enums;

namespace ParaRota.Application.Services;

// Kripto fiyat kaynağı (CoinGecko, TL). Impl: Infrastructure/MarketData/CoinGeckoClient.
public interface ICoinGeckoClient
{
    // Güncel TL fiyatı. null = ulaşılamadı / kripto değil.
    Task<decimal?> GetCurrentTryAsync(AssetType asset, CancellationToken ct = default);

    // Belirli tarihteki TL fiyatı (geçmiş alış için). null = veri yok.
    Task<decimal?> GetHistoricalTryAsync(AssetType asset, DateTime date, CancellationToken ct = default);
}
