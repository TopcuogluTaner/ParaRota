using System.Text.Json;
using Microsoft.Extensions.Logging;
using ParaRota.Application.Services;
using ParaRota.Domain.Enums;

namespace ParaRota.Infrastructure.MarketData;

// Yahoo Finance chart (anahtarsız). BaseAddress DI'da: https://query1.finance.yahoo.com/
//   v8/finance/chart/{symbol}?interval=1d&period1=..&period2=..
//   result[0].timestamp[] + indicators.quote[0].close[] (BIST .IS → TL kapanış).
public class YahooStockClient(HttpClient http, ILogger<YahooStockClient> logger) : IYahooStockClient
{
    public Task<decimal?> GetCurrentTryAsync(AssetType asset, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        return FetchLastCloseAsync(asset, now - 7 * 86400, now + 86400, ct);
    }

    public Task<decimal?> GetHistoricalTryAsync(AssetType asset, DateTime date, CancellationToken ct = default)
    {
        var end = new DateTimeOffset(date.Date.AddDays(1), TimeSpan.Zero).ToUnixTimeSeconds();
        var start = end - 12 * 86400; // hafta sonu/tatil payı
        return FetchLastCloseAsync(asset, start, end, ct);
    }

    // [start, end] penceresindeki son (en güncel) null-olmayan kapanışı döner.
    private async Task<decimal?> FetchLastCloseAsync(AssetType asset, long start, long end, CancellationToken ct)
    {
        var symbol = AssetCatalog.YahooSymbol(asset);
        if (symbol is null) return null;
        try
        {
            var url = $"v8/finance/chart/{symbol}?interval=1d&period1={start}&period2={end}";
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (compatible; ParaRota/1.0)");

            using var resp = await http.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode) return null;

            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            if (!doc.RootElement.TryGetProperty("chart", out var chart)
                || !chart.TryGetProperty("result", out var result)
                || result.ValueKind != JsonValueKind.Array || result.GetArrayLength() == 0)
                return null;

            var r0 = result[0];
            if (!r0.TryGetProperty("indicators", out var ind)
                || !ind.TryGetProperty("quote", out var quote)
                || quote.ValueKind != JsonValueKind.Array || quote.GetArrayLength() == 0
                || !quote[0].TryGetProperty("close", out var closes)
                || closes.ValueKind != JsonValueKind.Array)
                return null;

            decimal? last = null;
            foreach (var c in closes.EnumerateArray())
                if (c.ValueKind == JsonValueKind.Number && c.TryGetDecimal(out var d))
                    last = d;
            return last;
        }
        catch (Exception ex)
        {
            // ağ/parse hatası → fiyat alınamadı (graceful); kaynak kesintisi loglardan izlenebilsin.
            logger.LogWarning(ex, "Yahoo hisse fiyatı alınamadı. Asset={Asset} Symbol={Symbol}", asset, symbol);
            return null;
        }
    }
}
