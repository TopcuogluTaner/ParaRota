using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using ParaRota.Application.Services;

namespace ParaRota.Infrastructure.MarketData;

// TEFAS yatırım fonu fiyatı (public API, anahtarsız, TL). BaseAddress DI'da:
// https://www.tefas.gov.tr/api/funds/
//   POST fonFiyatBilgiGetir  body { fonKodu, dil:"TR", periyod }  (periyod = ay: 1/3/6/12/36/60)
//   → { resultList: [ { fonKodu, fonUnvan, tarih:"yyyy-MM-dd", fiyat } ] }  (artan tarih sırası)
// Fonlar günde 1 fiyatlanır; throttle agresif (ardışık istekte 429) → çağrılar aralıklı
// yapılır (snapshot job MarketDataService'te Task.Delay ile boğmayı önler). Tek fonun
// güncel/geçmiş fiyatı tek istekle alınır.
public class TefasFundClient(HttpClient http, ILogger<TefasFundClient> logger) : ITefasFundClient
{
    // TEFAS yalnız sabit geri-bakış pencereleri kabul eder (ay).
    private static readonly int[] Periods = [1, 3, 6, 12, 36, 60];

    // Tüm fon listesi süreç-içi cache'i (arama için). Günde ~1 TEFAS çağrısı; filtre yerelde.
    private static readonly SemaphoreSlim AllFundsGate = new(1, 1);
    private static readonly TimeSpan AllFundsTtl = TimeSpan.FromHours(6);
    private static List<TefasFundSummary> _allFunds = [];
    private static DateTime _allFundsAt = DateTime.MinValue;

    public async Task<TefasFundQuote?> GetCurrentAsync(string fundCode, CancellationToken ct = default)
    {
        var records = await FetchAsync(fundCode, 1, ct);
        // En güncel (son) kayıt = güncel pay değeri.
        var last = records.Count > 0 ? records[^1] : null;
        if (last is null || last.Price <= 0m) return null;
        return new TefasFundQuote(fundCode.ToUpperInvariant(), last.Name, last.Price, last.Date);
    }

    public async Task<decimal?> GetHistoricalAsync(string fundCode, DateTime date, CancellationToken ct = default)
    {
        var target = date.Date;
        if (target >= DateTime.Now.Date)
        {
            var cur = await GetCurrentAsync(fundCode, ct);
            return cur?.Price;
        }

        var period = SelectPeriod(target);
        if (period is null) return null; // 5 yıldan eski → TEFAS veri vermiyor

        var records = await FetchAsync(fundCode, period.Value, ct);
        if (records.Count == 0) return null;

        // Tarihe eşit/önceki en yakın iş günü (hafta sonu/tatil toleransı).
        var match = records
            .Where(r => r.Date <= target && r.Price > 0m)
            .OrderByDescending(r => r.Date)
            .FirstOrDefault();
        return match?.Price;
    }

    public async Task<IReadOnlyList<TefasFundSummary>> SearchAsync(string query, int limit, CancellationToken ct = default)
    {
        var all = await GetAllFundsAsync(ct);
        var q = (query ?? string.Empty).Trim().ToUpperInvariant();
        if (q.Length == 0) return all.Take(limit).ToList();

        // Kod öne çıksın: kodla başlayan > kod içeren > ad içeren.
        return all
            .Where(f => f.Code.Contains(q, StringComparison.OrdinalIgnoreCase)
                     || f.Name.ToUpperInvariant().Contains(q))
            .OrderBy(f => f.Code.StartsWith(q, StringComparison.OrdinalIgnoreCase) ? 0
                        : f.Code.Contains(q, StringComparison.OrdinalIgnoreCase) ? 1 : 2)
            .ThenBy(f => f.Code, StringComparer.OrdinalIgnoreCase)
            .Take(limit)
            .ToList();
    }

    // Tüm fon listesi (cache'li). TTL dolduysa son iş gününden çeker; çekemezse eski cache kalır.
    private async Task<List<TefasFundSummary>> GetAllFundsAsync(CancellationToken ct)
    {
        if (_allFunds.Count > 0 && DateTime.Now - _allFundsAt < AllFundsTtl) return _allFunds;

        await AllFundsGate.WaitAsync(ct);
        try
        {
            if (_allFunds.Count > 0 && DateTime.Now - _allFundsAt < AllFundsTtl) return _allFunds;
            var fresh = await FetchAllFundsAsync(ct);
            if (fresh.Count > 0)
            {
                _allFunds = fresh;
                _allFundsAt = DateTime.Now;
            }
            return _allFunds;
        }
        finally
        {
            AllFundsGate.Release();
        }
    }

    // fonGnlBlgSiraliGetir (fonKodu=null) son iş gününde ~2000 fonu kod+ad+fiyatla döndürür.
    // Hafta sonu/tatilde boş döner → en fazla 7 gün geriye yürü.
    private async Task<List<TefasFundSummary>> FetchAllFundsAsync(CancellationToken ct)
    {
        for (var back = 0; back < 7; back++)
        {
            var d = DateTime.Now.Date.AddDays(-back).ToString("yyyyMMdd", CultureInfo.InvariantCulture);
            // Ham JSON gövde: TEFAS body'si `sfonTurKod` ve `sFonTurKod` gibi yalnız harf
            // büyüklüğüyle ayrışan iki alan içerir; PostAsJsonAsync'in camelCase politikası
            // bunları aynı isme indirip "property name collides" hatası verir → ham string şart.
            var json = $$"""
            {"fonTipi":"YAT","fonKodu":null,"aramaMetni":null,"fonTurKod":null,"fonGrubu":null,"sfonTurKod":null,"fonTurAciklama":null,"kurucuKod":null,"basTarih":"{{d}}","bitTarih":"{{d}}","basSira":1,"bitSira":100000,"dil":"TR","sFonTurKod":"","fonKod":"","fonGrup":"","fonUnvanTip":""}
            """;
            try
            {
                using var content = new StringContent(json, Encoding.UTF8, "application/json");
                using var resp = await http.PostAsync("fonGnlBlgSiraliGetir", content, ct);
                if (!resp.IsSuccessStatusCode) continue;
                await using var stream = await resp.Content.ReadAsStreamAsync(ct);
                using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
                if (!doc.RootElement.TryGetProperty("resultList", out var list) || list.ValueKind != JsonValueKind.Array)
                    continue;

                var result = new List<TefasFundSummary>(list.GetArrayLength());
                foreach (var el in list.EnumerateArray())
                {
                    var code = el.TryGetProperty("fonKodu", out var cEl) ? cEl.GetString() : null;
                    if (string.IsNullOrWhiteSpace(code)) continue;
                    var name = el.TryGetProperty("fonUnvan", out var nEl) && nEl.ValueKind == JsonValueKind.String
                        ? nEl.GetString() ?? string.Empty : string.Empty;
                    var price = ReadDecimal(el, "fiyat") ?? 0m;
                    result.Add(new TefasFundSummary(code.ToUpperInvariant(), name, price));
                }
                if (result.Count > 0)
                {
                    result.Sort((a, b) => string.CompareOrdinal(a.Code, b.Code));
                    return result;
                }
            }
            catch (Exception ex)
            {
                // ağ/parse/429 → bir sonraki günü dene; hepsi başarısızsa boş döner
                logger.LogWarning(ex, "TEFAS fon listesi alınamadı (gün -{Back}).", back);
            }
        }
        return [];
    }

    // Geri-bakış penceresi: bugünden target'a kadar olan ay farkını kapsayan en küçük periyod.
    private static int? SelectPeriod(DateTime target)
    {
        var months = ((DateTime.Now.Year - target.Year) * 12) + DateTime.Now.Month - target.Month + 1;
        if (months <= 0) return 1;
        foreach (var p in Periods)
            if (months <= p) return p;
        return null; // > 60 ay
    }

    private async Task<List<Record>> FetchAsync(string fundCode, int period, CancellationToken ct)
    {
        try
        {
            // StringContent ile gönder (Content-Length set edilir). PostAsJsonAsync gövdeyi
            // Content-Length'siz/chunked stream'liyor; TEFAS Java sunucusu chunked request
            // body'yi reddedip HTTP 500 dönüyor → fiyat alınamıyordu.
            var json = JsonSerializer.Serialize(new { fonKodu = fundCode.Trim().ToUpperInvariant(), dil = "TR", periyod = period });
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var resp = await http.PostAsync("fonFiyatBilgiGetir", content, ct);
            if (!resp.IsSuccessStatusCode) return [];

            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            if (!doc.RootElement.TryGetProperty("resultList", out var list) || list.ValueKind != JsonValueKind.Array)
                return [];

            var result = new List<Record>(list.GetArrayLength());
            foreach (var el in list.EnumerateArray())
            {
                if (!el.TryGetProperty("tarih", out var tEl) || tEl.ValueKind != JsonValueKind.String) continue;
                if (!DateTime.TryParse(tEl.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.None, out var t)) continue;

                var price = ReadDecimal(el, "fiyat");
                if (price is null) continue;

                var name = el.TryGetProperty("fonUnvan", out var nEl) && nEl.ValueKind == JsonValueKind.String
                    ? nEl.GetString() ?? string.Empty
                    : string.Empty;

                result.Add(new Record(t.Date, price.Value, name));
            }
            // Tarihe göre artan (TEFAS zaten artan döndürür ama garanti).
            result.Sort((a, b) => a.Date.CompareTo(b.Date));
            return result;
        }
        catch (Exception ex)
        {
            // ağ/SSL/parse/429 → fiyat alınamadı; çağıran null/eski snapshot'a düşer.
            logger.LogWarning(ex, "TEFAS fon fiyatı alınamadı. Fund={Fund} Period={Period}", fundCode, period);
            return [];
        }
    }

    private static decimal? ReadDecimal(JsonElement el, string prop)
    {
        if (!el.TryGetProperty(prop, out var v)) return null;
        if (v.ValueKind == JsonValueKind.Number && v.TryGetDecimal(out var d)) return d;
        if (v.ValueKind == JsonValueKind.String
            && decimal.TryParse(v.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var ds)) return ds;
        return null;
    }

    private sealed record Record(DateTime Date, decimal Price, string Name);
}
