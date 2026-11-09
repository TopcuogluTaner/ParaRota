using ParaRota.Application.DTOs.SystemStatus;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Services;

/// <summary>Admin sistem durumu — çalışma zamanı + DB bağlantısı + Hangfire job durumu.</summary>
public interface ISystemStatusService
{
    Task<ApiResponse<SystemStatusDto>> GetAsync(CancellationToken cancellationToken = default);
}
