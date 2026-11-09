using ParaRota.Domain.Enums;

namespace ParaRota.Application.Services;

// Hisse fiyat kaynağı (Yahoo Finance, BIST .IS TL). Impl: Infrastructure/MarketData/YahooStockClient.
public interface IYahooStockClient
{
    // Güncel TL fiyatı (son kapanış). null = ulaşılamadı / hisse değil.
    Task<decimal?> GetCurrentTryAsync(AssetType asset, CancellationToken ct = default);

    // Belirli tarihteki (o gün/önceki son) TL kapanış. null = veri yok.
    Task<decimal?> GetHistoricalTryAsync(AssetType asset, DateTime date, CancellationToken ct = default);
}
