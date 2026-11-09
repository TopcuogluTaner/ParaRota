using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ParaRota.Application.Services;
using ParaRota.Domain.Enums;

namespace ParaRota.Infrastructure.MarketData;

// TCMB EVDS3 istemcisi. Doğrulanmış uç (spike 2026-06-04):
//   GET {BaseUrl}series=<KOD>&startDate=GG-AA-YYYY&endDate=GG-AA-YYYY&type=json
//   header: key: <ApiKey>
// Yanıt: { "items":[ { "Tarih":..., "<KOD_alt_cizgili>":"deger", "UNIXTIME":{...} } ] }
public class EvdsClient(HttpClient http, IOptions<EvdsSettings> options, ILogger<EvdsClient> logger) : IEvdsClient
{
    private readonly EvdsSettings _settings = options.Value;

    public async Task<(decimal buy, decimal sell)?> GetFxAsync(AssetType asset, DateTime date, CancellationToken ct = default)
    {
        var codes = AssetCatalog.FxSeries(asset);
        if (codes is null) return null;

        // Hafta sonu/tatil → son iş gününe düşmek için 10 günlük geriye pencere.
        var start = date.AddDays(-10);
        var buy = await FetchLastValueAsync(codes.Value.buy, start, date, ct);
        var sell = await FetchLastValueAsync(codes.Value.sell, start, date, ct);
        if (buy is null || sell is null) return null;
        var div = AssetCatalog.FxUnitDivisor(asset); // ör. JPY 100 birim üzerinden kotalı
        return (buy.Value / div, sell.Value / div);
    }

    public Task<(decimal buy, decimal sell)?> GetLatestFxAsync(AssetType asset, CancellationToken ct = default)
        => GetFxAsync(asset, DateTime.Now.Date, ct);

    public Task<decimal?> GetMonthlyGoldAsync(AssetType asset, DateTime month, CancellationToken ct = default)
    {
        var series = AssetCatalog.GoldMonthlySeries(asset);
        if (series is null) return Task.FromResult<decimal?>(null); // çeyrek/yarım/tam → resmi aylık yok
        var firstOfMonth = new DateTime(month.Year, month.Month, 1);
        var start = firstOfMonth.AddMonths(-6);
        var end = firstOfMonth.AddMonths(1).AddDays(-1);
        return FetchLastValueAsync(series, start, end, ct);
    }

    public Task<decimal?> GetLatestMonthlyGoldAsync(AssetType asset, CancellationToken ct = default)
        => GetMonthlyGoldAsync(asset, DateTime.Now.Date, ct);

    // Aylık serinin [start, end] aralığındaki tüm noktaları (ör. TÜFE TP.FG.J0).
    // Aylık seride "Tarih" alanı "yyyy-M" formatında gelir (ör. "2026-5").
    public async Task<IReadOnlyList<(DateTime Month, decimal Value)>> GetMonthlySeriesAsync(string seriesCode, DateTime start, DateTime end, CancellationToken ct = default)
    {
        var s = start.ToString("dd-MM-yyyy", CultureInfo.InvariantCulture);
        var e = end.ToString("dd-MM-yyyy", CultureInfo.InvariantCulture);
        var url = $"series={seriesCode}&startDate={s}&endDate={e}&type=json";
        var result = new List<(DateTime, decimal)>();
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            if (!string.IsNullOrWhiteSpace(_settings.ApiKey))
                req.Headers.TryAddWithoutValidation("key", _settings.ApiKey);

            using var resp = await http.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode) return result;

            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            if (!doc.RootElement.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array)
                return result;

            var key = seriesCode.Replace('.', '_');
            foreach (var item in items.EnumerateArray())
            {
                if (!item.TryGetProperty(key, out var v) || !item.TryGetProperty("Tarih", out var tarih)) continue;
                var raw = v.ValueKind switch
                {
                    JsonValueKind.String => v.GetString(),
                    JsonValueKind.Number => v.GetRawText(),
                    _ => null,
                };
                if (!decimal.TryParse(raw, NumberStyles.Any, CultureInfo.InvariantCulture, out var d)) continue;
                if (!DateTime.TryParseExact(tarih.GetString(), new[] { "yyyy-M", "yyyy-MM", "M-yyyy", "MM-yyyy" },
                        CultureInfo.InvariantCulture, DateTimeStyles.None, out var m)) continue;
                result.Add((new DateTime(m.Year, m.Month, 1), d));
            }
            result.Sort((a, b) => a.Item1.CompareTo(b.Item1));
            return result;
        }
        catch (Exception ex)
        {
            // ağ/parse hatası → boş liste (graceful); EVDS kesintisi loglardan izlenebilsin.
            logger.LogWarning(ex, "EVDS aylık seri alınamadı. Series={Series}", seriesCode);
            return result;
        }
    }

    // [start, end] aralığındaki son (en güncel) değeri döner. Aylık seride de çalışır
    // (EVDS kronolojik döner; end'e kadar olan son item alınır).
    private async Task<decimal?> FetchLastValueAsync(string seriesCode, DateTime start, DateTime end, CancellationToken ct)
    {
        var s = start.ToString("dd-MM-yyyy", CultureInfo.InvariantCulture);
        var e = end.ToString("dd-MM-yyyy", CultureInfo.InvariantCulture);
        // Path-style param (sondaki BaseUrl '/' + relative; '?' YOK).
        var url = $"series={seriesCode}&startDate={s}&endDate={e}&type=json";
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            if (!string.IsNullOrWhiteSpace(_settings.ApiKey))
                req.Headers.TryAddWithoutValidation("key", _settings.ApiKey);

            using var resp = await http.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode) return null;

            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            if (!doc.RootElement.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array)
                return null;

            var key = seriesCode.Replace('.', '_');
            decimal? last = null;
            foreach (var item in items.EnumerateArray())
            {
                if (!item.TryGetProperty(key, out var v)) continue;
                var raw = v.ValueKind switch
                {
                    JsonValueKind.String => v.GetString(),
                    JsonValueKind.Number => v.GetRawText(),
                    _ => null,
                };
                if (decimal.TryParse(raw, NumberStyles.Any, CultureInfo.InvariantCulture, out var d))
                    last = d;
            }
            return last;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "EVDS seri değeri alınamadı. Series={Series}", seriesCode);
            return null;
        }
    }
}
