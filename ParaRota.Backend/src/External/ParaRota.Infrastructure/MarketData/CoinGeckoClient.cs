using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using ParaRota.Application.Services;
using ParaRota.Domain.Enums;

namespace ParaRota.Infrastructure.MarketData;

// CoinGecko (anahtarsız, TL). BaseAddress DI'da: https://api.coingecko.com/api/v3/
//   güncel:  simple/price?ids={id}&vs_currencies=try   → { "bitcoin": { "try": 2905475 } }
//   geçmiş:  coins/{id}/history?date=dd-mm-yyyy         → market_data.current_price.try
public class CoinGeckoClient(HttpClient http, ILogger<CoinGeckoClient> logger) : ICoinGeckoClient
{
    public async Task<decimal?> GetCurrentTryAsync(AssetType asset, CancellationToken ct = default)
    {
        var id = AssetCatalog.CoinGeckoId(asset);
        if (id is null) return null;
        try
        {
            using var resp = await http.GetAsync($"simple/price?ids={id}&vs_currencies=try", ct);
            if (!resp.IsSuccessStatusCode) return null;
            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            if (doc.RootElement.TryGetProperty(id, out var coin) && coin.TryGetProperty("try", out var v) && v.TryGetDecimal(out var d))
                return d;
            return null;
        }
        catch (Exception ex)
        {
            // ağ/SSL/parse hatası → fiyat alınamadı (servis 502 döner, 500 çökme yok).
            // Sessiz kalmasın: kaynak uzun süre ölürse loglardan görünsün.
            logger.LogWarning(ex, "CoinGecko güncel fiyat alınamadı. Asset={Asset}", asset);
            return null;
        }
    }

    public async Task<decimal?> GetHistoricalTryAsync(AssetType asset, DateTime date, CancellationToken ct = default)
    {
        var id = AssetCatalog.CoinGeckoId(asset);
        if (id is null) return null;
        try
        {
            var d = date.ToString("dd-MM-yyyy", CultureInfo.InvariantCulture);
            using var resp = await http.GetAsync($"coins/{id}/history?date={d}&localization=false", ct);
            if (!resp.IsSuccessStatusCode) return null;
            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            if (doc.RootElement.TryGetProperty("market_data", out var md)
                && md.TryGetProperty("current_price", out var cp)
                && cp.TryGetProperty("try", out var v)
                && v.TryGetDecimal(out var price))
                return price;
            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "CoinGecko geçmiş fiyat alınamadı. Asset={Asset} Date={Date:yyyy-MM-dd}", asset, date);
            return null;
        }
    }
}
