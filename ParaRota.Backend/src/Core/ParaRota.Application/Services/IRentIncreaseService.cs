using ParaRota.Application.DTOs.Rent;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Services;

public interface IRentIncreaseService
{
    /// <summary>
    /// Verilen yenileme ayı/yılı için yasal azami kira artışını hesaplar
    /// (TÜFE 12 aylık ortalamalara göre değişim — EVDS TP.FG.J0 endeksinden).
    /// </summary>
    Task<ApiResponse<RentIncreaseResultDto>> CalculateAsync(decimal currentRent, int renewalMonth, int renewalYear, CancellationToken cancellationToken = default);
}
