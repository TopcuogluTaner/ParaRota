using ParaRota.Application.DTOs.SystemLogs;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Services;

/// <summary>Admin sistem logları (ErrorLog) — yalnız okuma + topluca temizleme.</summary>
public interface ISystemLogService
{
    Task<ApiResponse<PagedResponse<ErrorLogDto>>> GetErrorLogsAsync(SystemLogListParams query, CancellationToken cancellationToken = default);

    /// <summary>Tüm hata loglarını kalıcı siler (housekeeping). Geriye silinen kayıt sayısı.</summary>
    Task<ApiResponse<int>> ClearAllAsync(CancellationToken cancellationToken = default);
}
