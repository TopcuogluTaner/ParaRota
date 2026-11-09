using Microsoft.EntityFrameworkCore;
using ParaRota.Application.DTOs.Investments;
using ParaRota.Application.Services;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

// Piyasa verisi orkestrasyonu (çok kaynaklı). Değerleme snapshot'tan okunur (hızlı,
// stabil); günlük Hangfire job snapshot yazar. Geçmiş alış günü fiyatı market'ten.
// TEFAS fonları: somut fon FundCode ile ayrışır (tek "TefasFund" enum'ı altında).
public class MarketDataService(
    AppDbContext context,
    IEvdsClient evds,
    ITruncgilGoldClient truncgil,
    ICoinGeckoClient coingecko,
    IYahooStockClient yahoo,
    ITefasFundClient tefas,
    ICurrentUserService currentUser) : IMarketDataService
{
    private const string TefasSource = "TEFAS";

    // Kur panosu/snapshot job'unda dönülen somut varlıklar — "işaret" TefasFund hariç
    // (somut fon FundCode ile gelir, enum'da listelenmez).
    private static readonly AssetType[] FixedAssets =
        [.. Enum.GetValues<AssetType>().Where(a => !a.IsTefas())];

    // Değerleme: en güncel snapshot'ın satış fiyatı (referans). Snapshot yoksa canlı dener.
    public async Task<decimal?> GetSpotPriceAsync(AssetType asset, string? fundCode, CancellationToken ct = default)
    {
        var snap = await SnapshotQuery(asset, fundCode)
            .OrderByDescending(x => x.AsOf)
            .FirstOrDefaultAsync(ct);
        if (snap is not null) return snap.SellPrice;

        var live = await FetchSpotAsync(asset, fundCode, ct);
        return live?.sell;
    }

    // Alış günü birim fiyatı (geçmiş): döviz = EVDS o tarih, gram altın = resmi aylık o ay,
    // TEFAS = o tarihteki pay değeri.
    public async Task<decimal?> GetUnitPriceAsync(AssetType asset, string? fundCode, DateTime date, CancellationToken ct = default)
    {
        if (date.Date >= DateTime.Now.Date)
            return await GetSpotPriceAsync(asset, fundCode, ct);

        if (asset.IsTefas())
            return string.IsNullOrWhiteSpace(fundCode) ? null : await tefas.GetHistoricalAsync(fundCode, date, ct);

        if (asset.IsGold())
        {
            // Resmi aylık (gram/Cumhuriyet) varsa onu; yoksa (çeyrek/yarım/tam) güncel
            // truncgil fiyatına yaklaşık düş (geçmiş resmi veri yok).
            var monthly = await evds.GetMonthlyGoldAsync(asset, date, ct);
            if (monthly is not null) return monthly;
            return (await truncgil.GetGoldAsync(asset, ct))?.sell;
        }

        if (asset.IsCrypto()) return await coingecko.GetHistoricalTryAsync(asset, date, ct);
        if (asset.IsStock()) return await yahoo.GetHistoricalTryAsync(asset, date, ct);

        var fx = await evds.GetFxAsync(asset, date, ct);
        return fx?.sell;
    }

    // Günlük job: her sabit varlık + kullanıcıların tuttuğu/alarm kurduğu TEFAS fonları için
    // güncel fiyatı snapshot'a upsert eder.
    public async Task<int> RefreshSnapshotsAsync(CancellationToken ct = default)
    {
        var asOf = DateTime.Now.Date;
        var written = 0;

        foreach (var asset in FixedAssets)
        {
            // CoinGecko ücretsiz katman toplu çağrıda 429/403 veriyor → kripto çağrılarını
            // ~2sn aralıkla yap (12 coin ≈ 24sn; günlük job + manuel tetik için kabul edilebilir).
            if (asset.IsCrypto()) await Task.Delay(2000, ct);
            var p = await FetchSpotAsync(asset, null, ct);
            if (p is null) continue;

            var source = asset.Class() switch
            {
                AssetClass.Gold => "Truncgil",
                AssetClass.Crypto => "CoinGecko",
                AssetClass.Stock => "Yahoo",
                _ => "EVDS",
            };

            if (await UpsertSnapshotAsync(asset, null, asOf, source, p.Value.buy, p.Value.sell, ct))
                written++;
        }

        // TEFAS fonları — yalnız kullanıcıların gerçekten sahip olduğu/alarm kurduğu kodlar
        // (800+ fonun hepsi değil). TEFAS agresif throttle eder → her çağrı arası gecikme.
        foreach (var code in await DistinctTefasCodesAsync(ct))
        {
            await Task.Delay(1500, ct);
            var q = await tefas.GetCurrentAsync(code, ct);
            if (q is null) continue;

            if (await UpsertSnapshotAsync(AssetType.TefasFund, code, asOf, TefasSource, q.Price, q.Price, ct))
                written++;
        }

        await context.SaveChangesAsync(ct);
        return written;
    }

    // Güncel kur panosu: her sabit varlık için en güncel snapshot fiyatı + sınıfı.
    // TEFAS fonları panoda listelenmez (kullanıcıya özel, 800+ fon) — portföyde gösterilir.
    public async Task<IReadOnlyList<AssetRateDto>> GetRatesAsync(CancellationToken ct = default)
    {
        // Tarih penceresi: tablo her gün büyüyor; "en güncel" için tüm geçmişi çekmek
        // gereksiz (14 gün = uzun bayram tatilini de kapsar). Kaynak daha uzun ölürse
        // pano fiyatı boş görünür — bu da zaten istenen sinyal.
        var windowStart = DateTime.Now.AddDays(-14);
        var snaps = await context.AssetPriceSnapshots.AsNoTracking()
            .Where(x => x.FundCode == null && x.AsOf >= windowStart)
            .ToListAsync(ct);
        var latest = snaps
            .GroupBy(s => s.AssetType)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.AsOf).First());

        var rates = FixedAssets.Select(a =>
        {
            latest.TryGetValue(a, out var s);
            return new AssetRateDto
            {
                AssetType = a,
                AssetClass = a.Class(),
                Sell = s?.SellPrice,
                Buy = s?.BuyPrice,
                AsOf = s?.AsOf,
            };
        }).ToList();

        // Kullanıcının kendi TEFAS fonları (pano global değil; 2000+ fon listelenemez).
        rates.AddRange(await UserTefasRatesAsync(ct));
        return rates;
    }

    // Aktif scope'taki kullanıcının tuttuğu/alarm kurduğu TEFAS fonları + en güncel snapshot.
    private async Task<List<AssetRateDto>> UserTefasRatesAsync(CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId is null) return [];

        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId.Value, currentUser.ActiveHouseholdId, ct);

        var holdingQ = scope.HasValue
            ? context.InvestmentHoldings.AsNoTracking().Where(h => h.HouseholdId == scope.Value)
            : context.InvestmentHoldings.AsNoTracking().Where(h => h.HouseholdId == null && h.UserId == userId);
        var alarmQ = scope.HasValue
            ? context.PriceAlarms.AsNoTracking().Where(a => a.HouseholdId == scope.Value)
            : context.PriceAlarms.AsNoTracking().Where(a => a.HouseholdId == null && a.UserId == userId);

        var fromHoldings = await holdingQ
            .Where(h => h.AssetType == AssetType.TefasFund && h.FundCode != null)
            .Select(h => new { h.FundCode, h.FundName }).ToListAsync(ct);
        var fromAlarms = await alarmQ
            .Where(a => a.AssetType == AssetType.TefasFund && a.FundCode != null)
            .Select(a => new { a.FundCode, a.FundName }).ToListAsync(ct);

        var distinct = fromHoldings.Concat(fromAlarms)
            .GroupBy(f => f.FundCode!, StringComparer.OrdinalIgnoreCase)
            .Select(g => new { Code = g.Key, Name = g.Select(x => x.FundName).FirstOrDefault(n => !string.IsNullOrEmpty(n)) })
            .ToList();
        if (distinct.Count == 0) return [];

        var codes = distinct.Select(d => d.Code).ToList();
        var fundWindowStart = DateTime.Now.AddDays(-14); // GetRatesAsync ile aynı gerekçe
        var snaps = await context.AssetPriceSnapshots.AsNoTracking()
            .Where(s => s.AssetType == AssetType.TefasFund && s.FundCode != null && codes.Contains(s.FundCode)
                     && s.AsOf >= fundWindowStart)
            .ToListAsync(ct);
        var latest = snaps
            .GroupBy(s => s.FundCode!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.AsOf).First(), StringComparer.OrdinalIgnoreCase);

        return distinct.Select(d =>
        {
            latest.TryGetValue(d.Code, out var s);
            return new AssetRateDto
            {
                AssetType = AssetType.TefasFund,
                AssetClass = AssetClass.TefasFund,
                FundCode = d.Code,
                FundName = d.Name,
                Sell = s?.SellPrice,
                Buy = s?.BuyPrice,
                AsOf = s?.AsOf,
            };
        }).ToList();
    }

    // Canlı güncel birim fiyat (snapshot atlanır) — satış fiyatı. Alarm job'u kullanır.
    public async Task<decimal?> GetLiveSpotPriceAsync(AssetType asset, string? fundCode, CancellationToken ct = default)
        => (await FetchSpotAsync(asset, fundCode, ct))?.sell;

    // TEFAS fon kodu doğrulama + güncel kotasyon (ekleme formu için).
    public Task<TefasFundQuote?> LookupTefasFundAsync(string fundCode, CancellationToken ct = default)
        => string.IsNullOrWhiteSpace(fundCode) ? Task.FromResult<TefasFundQuote?>(null) : tefas.GetCurrentAsync(fundCode, ct);

    // TEFAS fon arama (kullanıcı seçici için) — cache'li liste üzerinden filtre.
    public Task<IReadOnlyList<TefasFundSummary>> SearchTefasFundsAsync(string query, CancellationToken ct = default)
        => tefas.SearchAsync(query ?? string.Empty, 40, ct);

    // Ekleme anında TEFAS snapshot'ı yaz — fon pano/değerlemede ertesi günkü job'u beklemeden görünsün.
    public async Task SaveTefasSnapshotAsync(string fundCode, decimal price, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(fundCode) || price <= 0m) return;
        await UpsertSnapshotAsync(AssetType.TefasFund, fundCode.Trim().ToUpperInvariant(), DateTime.Now.Date, TefasSource, price, price, ct);
        await context.SaveChangesAsync(ct);
    }

    // ── yardımcılar ──────────────────────────────────────────────────────────

    // Snapshot sorgusu — FundCode null/değer ayrımını EF'in null-parametre tuzağına
    // düşmeden açıkça kurar.
    private IQueryable<AssetPriceSnapshot> SnapshotQuery(AssetType asset, string? fundCode)
    {
        var q = context.AssetPriceSnapshots.AsNoTracking().Where(x => x.AssetType == asset);
        return fundCode is null ? q.Where(x => x.FundCode == null) : q.Where(x => x.FundCode == fundCode);
    }

    private async Task<List<string>> DistinctTefasCodesAsync(CancellationToken ct)
    {
        var fromHoldings = await context.InvestmentHoldings.AsNoTracking()
            .Where(x => x.AssetType == AssetType.TefasFund && x.FundCode != null)
            .Select(x => x.FundCode!).Distinct().ToListAsync(ct);
        var fromAlarms = await context.PriceAlarms.AsNoTracking()
            .Where(x => x.AssetType == AssetType.TefasFund && x.FundCode != null)
            .Select(x => x.FundCode!).Distinct().ToListAsync(ct);
        return fromHoldings.Union(fromAlarms, StringComparer.OrdinalIgnoreCase).ToList();
    }

    private async Task<bool> UpsertSnapshotAsync(
        AssetType asset, string? fundCode, DateTime asOf, string source, decimal buy, decimal sell, CancellationToken ct)
    {
        var existing = await SnapshotQuery(asset, fundCode)
            .AsTracking()
            .FirstOrDefaultAsync(x => x.AsOf == asOf && x.Source == source, ct);

        if (existing is null)
        {
            await context.AssetPriceSnapshots.AddAsync(new AssetPriceSnapshot
            {
                AssetType = asset,
                FundCode = fundCode,
                AsOf = asOf,
                BuyPrice = buy,
                SellPrice = sell,
                Source = source,
            }, ct);
        }
        else
        {
            existing.BuyPrice = buy;
            existing.SellPrice = sell;
        }
        return true;
    }

    // Canlı güncel fiyat: altın=truncgil, kripto=CoinGecko, hisse=Yahoo, döviz=EVDS,
    // TEFAS=public API. Kripto/hisse/TEFAS tek fiyat → (buy=sell).
    private async Task<(decimal buy, decimal sell)?> FetchSpotAsync(AssetType asset, string? fundCode, CancellationToken ct)
    {
        if (asset.IsTefas())
        {
            if (string.IsNullOrWhiteSpace(fundCode)) return null;
            var q = await tefas.GetCurrentAsync(fundCode, ct);
            return q is null ? null : (q.Price, q.Price);
        }
        if (asset.IsGold()) return await truncgil.GetGoldAsync(asset, ct);
        if (asset.IsCrypto())
        {
            var p = await coingecko.GetCurrentTryAsync(asset, ct);
            return p is null ? null : (p.Value, p.Value);
        }
        if (asset.IsStock())
        {
            var p = await yahoo.GetCurrentTryAsync(asset, ct);
            return p is null ? null : (p.Value, p.Value);
        }
        return await evds.GetLatestFxAsync(asset, ct);
    }
}
