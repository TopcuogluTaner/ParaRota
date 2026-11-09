using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using ParaRota.Application.Services;
using ParaRota.Domain.Enums;

namespace ParaRota.Infrastructure.MarketData;

// Günlük (canlı) altın — gram/çeyrek/yarım/tam/Cumhuriyet (truncgil, anahtarsız).
// Yanıt: { "gram-altin": { "Alış":"6.598,27", "Satış":"6.599,09", ... }, "ceyrek-altin": {...}, ... }
public class TruncgilGoldClient(HttpClient http, ILogger<TruncgilGoldClient> logger) : ITruncgilGoldClient
{
    public async Task<(decimal buy, decimal sell)?> GetGoldAsync(AssetType asset, CancellationToken ct = default)
    {
        var key = AssetCatalog.GoldTruncgilKey(asset);
        if (key is null) return null;
        try
        {
            using var resp = await http.GetAsync("today.json", ct);
            if (!resp.IsSuccessStatusCode) return null;

            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            if (!doc.RootElement.TryGetProperty(key, out var g)) return null;

            var buy = ParseTr(g, "Alış");
            var sell = ParseTr(g, "Satış");
            if (buy is null || sell is null) return null;
            return (buy.Value, sell.Value);
        }
        catch (Exception ex)
        {
            // ağ/parse hatası → fiyat alınamadı (graceful); kaynak kesintisi loglardan izlenebilsin.
            logger.LogWarning(ex, "Truncgil altın fiyatı alınamadı. Asset={Asset}", asset);
            return null;
        }
    }

    // TR format "6.598,27" → 6598.27 (binlik '.' atılır, ',' ondalık olur).
    private static decimal? ParseTr(JsonElement obj, string prop)
    {
        if (!obj.TryGetProperty(prop, out var v) || v.ValueKind != JsonValueKind.String) return null;
        var raw = v.GetString();
        if (string.IsNullOrWhiteSpace(raw)) return null;
        raw = raw.Replace(".", string.Empty).Replace(',', '.');
        return decimal.TryParse(raw, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : null;
    }
}
