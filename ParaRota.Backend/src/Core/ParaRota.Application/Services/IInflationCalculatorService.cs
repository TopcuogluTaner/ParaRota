using ParaRota.Application.DTOs.Inflation;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Services;

public interface IInflationCalculatorService
{
    /// <summary>
    /// Verilen tutarın TÜFE (TP.FG.J0) bazında başlangıç ayından bitiş ayına eşdeğerini hesaplar.
    /// Bitiş ayı verilmezse (null) en güncel yayınlanan ay kullanılır. Çift yönlü.
    /// </summary>
    Task<ApiResponse<InflationConvertResultDto>> ConvertAsync(
        decimal amount, int fromMonth, int fromYear, int? toMonth, int? toYear, CancellationToken cancellationToken = default);
}
