using ParaRota.Application.DTOs.Rent;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;

namespace ParaRota.Infrastructure.Rent;

/// <summary>
/// Kira artışı hesaplayıcı. TBK m.344 gereği konut (ve işyeri) kira artışı, TÜFE'nin
/// "on iki aylık ortalamalara göre değişim" oranını aşamaz; pratikte yenileme ayından
/// BİR ÖNCEKİ ayın verisi kullanılır (TÜİK o veriyi yenileme ayının ilk günlerinde açıklar).
/// TÜFE aylık endeksi <see cref="ICpiIndexService"/>'ten (TP.FG.J0, 2003=100) okunur:
/// son 12 ayın endeks ortalaması / önceki 12 ayın ortalaması − 1.
/// </summary>
public class RentIncreaseService(ICpiIndexService cpi) : IRentIncreaseService
{
    public async Task<ApiResponse<RentIncreaseResultDto>> CalculateAsync(decimal currentRent, int renewalMonth, int renewalYear, CancellationToken cancellationToken = default)
    {
        // Yenileme ayından bir önceki ay = istenen referans TÜFE ayı.
        var requestedRef = new DateTime(renewalYear, renewalMonth, 1).AddMonths(-1);
        // Geleceğe dönük istekte en fazla "bugünün bir önceki ayı" açıklanmış olabilir.
        var lastPossible = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1).AddMonths(-1);
        var refCap = requestedRef <= lastPossible ? requestedRef : lastPossible;

        var rate = await GetRateAsync(refCap, cancellationToken);
        if (rate is null)
            return ApiResponse<RentIncreaseResultDto>.Fail("TÜFE verisi alınamadı.", 502, errorCode: ErrorCodes.RentDataUnavailable);

        var (effectiveMonth, ratePercent) = rate.Value;
        var maxNewRent = Math.Round(currentRent * (1 + ratePercent / 100m), 2);

        return ApiResponse<RentIncreaseResultDto>.Success(new RentIncreaseResultDto
        {
            CurrentRent = currentRent,
            RatePercent = ratePercent,
            MaxNewRent = maxNewRent,
            IncreaseAmount = Math.Round(maxNewRent - currentRent, 2),
            ReferenceMonth = effectiveMonth.Month,
            ReferenceYear = effectiveMonth.Year,
            IsProvisional = effectiveMonth < requestedRef,
        });
    }

    private async Task<(DateTime EffectiveMonth, decimal Rate)?> GetRateAsync(DateTime refMonth, CancellationToken ct)
    {
        // TÜİK/EVDS yayını aylarca gecikebilir (canlıda Haziran'da en son Ocak verisi görüldü).
        // Bu yüzden pencere geniş tutulur (40 ay) ve eldeki en güncel aya göre hesaplanır;
        // 24 ardışık değer gerekir (son 12 ort. / önceki 12 ort.).
        var series = await cpi.GetSeriesAsync(refMonth.AddMonths(-40), refMonth, ct);
        if (series.Count < 24) return null;

        var effective = series[^1].Month <= refMonth ? series[^1].Month : refMonth;
        var window = series.Where(p => p.Month <= effective).TakeLast(24).ToList();
        if (window.Count < 24) return null;

        var prev12 = window.Take(12).Sum(p => p.Index);
        var last12 = window.Skip(12).Sum(p => p.Index);
        if (prev12 <= 0) return null;

        var rate = Math.Round((last12 / prev12 - 1m) * 100m, 2);
        return (window[^1].Month, rate);
    }
}
