using Hangfire;
using ParaRota.Application.DTOs.PriceAlarms;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Services;

public interface IPriceAlarmService
{
    Task<ApiResponse<IReadOnlyList<PriceAlarmDto>>> GetMyAsync(int userId, AlarmStatus? status, CancellationToken cancellationToken = default);
    Task<ApiResponse<PriceAlarmDto>> CreateAsync(int userId, CreatePriceAlarmDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<PriceAlarmDto>> UpdateAsync(int userId, int id, UpdatePriceAlarmDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<PriceAlarmDto>> RearmAsync(int userId, int id, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default);

    /// <summary>Hangfire — aktif alarmları kontrol eder, eşik aşılanları tetikler; tetiklenen sayısını döner.</summary>
    // Hangfire: aynı job'ın iki instance'ı çakışmasın (restart/uzun koşu senaryosu).
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    Task<int> CheckAlarmsAsync(CancellationToken cancellationToken = default);
}
