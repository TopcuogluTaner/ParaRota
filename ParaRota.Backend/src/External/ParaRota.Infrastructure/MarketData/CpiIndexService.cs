using ParaRota.Application.Services;

namespace ParaRota.Infrastructure.MarketData;

/// <summary>
/// <see cref="ICpiIndexService"/> implementasyonu. TÜFE serisini (TP.FG.J0, 2003=100) EVDS'ten
/// tek seferde 2003 tabanından bugüne çeker ve süreç-içi önbellekte tutar; tüm aralık/ay
/// sorguları bu tek seriden dilimlenir. EVDS'e erişilemezse (boş yanıt) eldeki eski seri korunur.
/// </summary>
public class CpiIndexService(IEvdsClient evds) : ICpiIndexService
{
    private const string CpiSeries = "TP.FG.J0";

    // TÜFE 2003=100 serisi Ocak 2003'te başlar; tüm tarihsel sorgular bu tabandan beslenir.
    private static readonly DateTime SeriesFloor = new(2003, 1, 1);

    // Yeni açıklanan veri (ay başı) en geç 6 saatte görünsün.
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(6);

    // Eşzamanlı isteklerin EVDS'i aynı anda çağırmasını önler (tek fetch).
    private static readonly SemaphoreSlim Gate = new(1, 1);
    private static (DateTime FetchedAt, IReadOnlyList<CpiPoint> Series)? _cache;

    public async Task<IReadOnlyList<CpiPoint>> GetSeriesAsync(DateTime start, DateTime end, CancellationToken ct = default)
    {
        var all = await GetFullSeriesAsync(ct);
        if (all.Count == 0) return all;

        var lo = new DateTime(start.Year, start.Month, 1);
        var hi = new DateTime(end.Year, end.Month, 1);
        return all.Where(p => p.Month >= lo && p.Month <= hi).ToList();
    }

    public async Task<CpiPoint?> GetClosestNotAfterAsync(DateTime month, CancellationToken ct = default)
    {
        var all = await GetFullSeriesAsync(ct);
        var target = new DateTime(month.Year, month.Month, 1);

        CpiPoint? found = null;
        foreach (var p in all) // kronolojik sıralı; target'ı geçmeyen son nokta aranır
        {
            if (p.Month > target) break;
            found = p;
        }
        return found;
    }

    private async Task<IReadOnlyList<CpiPoint>> GetFullSeriesAsync(CancellationToken ct)
    {
        if (_cache is { } hit && DateTime.Now - hit.FetchedAt < CacheTtl)
            return hit.Series;

        await Gate.WaitAsync(ct);
        try
        {
            if (_cache is { } hit2 && DateTime.Now - hit2.FetchedAt < CacheTtl)
                return hit2.Series;

            var end = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
            var raw = await evds.GetMonthlySeriesAsync(CpiSeries, SeriesFloor, end, ct);
            var series = raw.Select(x => new CpiPoint(x.Month, x.Value)).ToList();

            // EVDS erişilemezse boş döner — eldeki eski seriyi koru (resilience), yoksa boş geç.
            if (series.Count == 0 && _cache is { } stale)
                return stale.Series;

            _cache = (DateTime.Now, series);
            return series;
        }
        finally
        {
            Gate.Release();
        }
    }
}
