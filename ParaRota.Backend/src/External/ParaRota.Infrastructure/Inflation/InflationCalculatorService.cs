using ParaRota.Application.DTOs.Inflation;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;

namespace ParaRota.Infrastructure.Inflation;

/// <summary>
/// TÜFE bazlı "paranın değeri" hesaplayıcı. Bir tutarın başlangıç ayından bitiş ayına
/// alım gücü eşdeğerini, EVDS TÜFE endeksinden (TP.FG.J0, 2003=100) ölçekleyerek bulur.
/// Endeks <see cref="ICpiIndexService"/>'ten gelir (kira artışıyla aynı tek kaynak).
/// </summary>
public class InflationCalculatorService(ICpiIndexService cpi) : IInflationCalculatorService
{
    // Grafik yükünü sınırlamak için seri en fazla bu kadar noktaya seyreltilir.
    private const int MaxSeriesPoints = 120;

    public async Task<ApiResponse<InflationConvertResultDto>> ConvertAsync(
        decimal amount, int fromMonth, int fromYear, int? toMonth, int? toYear, CancellationToken cancellationToken = default)
    {
        var fromReq = new DateTime(fromYear, fromMonth, 1);
        // Bitiş verilmezse "bugün" (en güncel yayınlanan aya düşer).
        var toReq = toMonth is int tm && toYear is int ty
            ? new DateTime(ty, tm, 1)
            : new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);

        var fromPoint = await cpi.GetClosestNotAfterAsync(fromReq, cancellationToken);
        var toPoint = await cpi.GetClosestNotAfterAsync(toReq, cancellationToken);

        if (fromPoint is null || toPoint is null || fromPoint.Index <= 0)
            return ApiResponse<InflationConvertResultDto>.Fail("TÜFE verisi alınamadı.", 502, errorCode: ErrorCodes.InflationDataUnavailable);

        var multiplier = toPoint.Index / fromPoint.Index;
        var equivalent = Math.Round(amount * multiplier, 2);

        // Alım gücü eğrisi: iki etkili ay arasındaki tüm noktalar (kronolojik), başlangıca göre normalize.
        var lo = fromPoint.Month <= toPoint.Month ? fromPoint.Month : toPoint.Month;
        var hi = fromPoint.Month <= toPoint.Month ? toPoint.Month : fromPoint.Month;
        var rangeSeries = await cpi.GetSeriesAsync(lo, hi, cancellationToken);
        var series = Downsample(rangeSeries)
            .Select(p => new InflationSeriesPointDto
            {
                Month = p.Month.Month,
                Year = p.Month.Year,
                Value = Math.Round(amount * p.Index / fromPoint.Index, 2),
            })
            .ToList();

        return ApiResponse<InflationConvertResultDto>.Success(new InflationConvertResultDto
        {
            Amount = amount,
            FromMonth = fromMonth,
            FromYear = fromYear,
            ToMonth = toReq.Month,
            ToYear = toReq.Year,
            EffectiveToMonth = toPoint.Month.Month,
            EffectiveToYear = toPoint.Month.Year,
            EquivalentAmount = equivalent,
            InflationPercent = Math.Round((multiplier - 1m) * 100m, 2),
            CumulativeMultiplier = Math.Round(multiplier, 4),
            AnnualizedPercent = Annualized(multiplier, fromPoint.Month, toPoint.Month),
            IsProvisional = toPoint.Month < toReq,
            Series = series,
        });
    }

    // Dönem ≥ 12 ay (ileri yön) ise yıllık bileşik enflasyon; aksi halde 0 (anlamlı değil).
    private static decimal Annualized(decimal multiplier, DateTime from, DateTime to)
    {
        var months = (to.Year - from.Year) * 12 + (to.Month - from.Month);
        if (months < 12 || multiplier <= 0) return 0m;
        var years = months / 12.0;
        var annual = (Math.Pow((double)multiplier, 1.0 / years) - 1.0) * 100.0;
        return Math.Round((decimal)annual, 2);
    }

    // Noktaları MaxSeriesPoints'e seyreltir; ilk ve son nokta her zaman korunur.
    private static IReadOnlyList<CpiPoint> Downsample(IReadOnlyList<CpiPoint> points)
    {
        if (points.Count <= MaxSeriesPoints) return points;

        var step = (int)Math.Ceiling(points.Count / (double)MaxSeriesPoints);
        var result = new List<CpiPoint>();
        for (var i = 0; i < points.Count; i += step)
            result.Add(points[i]);
        if (result[^1].Month != points[^1].Month)
            result.Add(points[^1]);
        return result;
    }
}
