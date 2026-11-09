using Hangfire;
using ParaRota.Application.DTOs.GoldDays;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Services;

public interface IGoldDayService
{
    Task<ApiResponse<IReadOnlyList<GoldDayListItemDto>>> GetMyAsync(int userId, GoldDayStatus? status, CancellationToken cancellationToken = default);
    Task<ApiResponse<GoldDayDetailDto>> GetByIdAsync(int userId, int id, CancellationToken cancellationToken = default);
    Task<ApiResponse<GoldDayDetailDto>> CreateAsync(int userId, CreateGoldDayDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<GoldDayDetailDto>> UpdateAsync(int userId, int id, UpdateGoldDayDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default);
    Task<ApiResponse<GoldDayDetailDto>> SetContributionPaidAsync(int userId, int contributionId, bool isPaid, CancellationToken cancellationToken = default);
    Task<ApiResponse<GoldDayDetailDto>> SetMeetingCompletedAsync(int userId, int meetingId, bool isCompleted, CancellationToken cancellationToken = default);

    /// <summary>Hangfire — yaklaşan toplantıları hatırlatır; gönderilen bildirim sayısını döner.</summary>
    // Hangfire: aynı job'ın iki instance'ı çakışmasın (restart/uzun koşu senaryosu).
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    Task<int> SendMeetingRemindersAsync(CancellationToken cancellationToken = default);
}
