using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using Hangfire;
using Hangfire.Storage;
using Microsoft.EntityFrameworkCore;
using ParaRota.Application.DTOs.SystemStatus;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;
using ParaRota.Persistence.Context;

namespace ParaRota.WebApi.Services;

/// <summary>
/// Sistem durumu toplayıcısı. WebApi katmanında yaşar çünkü hem Hangfire (yalnız burada
/// referanslı, <see cref="JobStorage.Current"/> global) hem DbContext hem host bilgisine erişir.
/// Interface Application'da, controller Presentation'da — katmanlar bozulmaz (DI runtime'da bağlar).
/// </summary>
public class SystemStatusService(AppDbContext context, IHostEnvironment environment) : ISystemStatusService
{
    public async Task<ApiResponse<SystemStatusDto>> GetAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.Now;
        var startedAt = Process.GetCurrentProcess().StartTime;

        var dto = new SystemStatusDto
        {
            ServerTime = now,
            TimeZone = TimeZoneInfo.Local.Id,
            Environment = environment.EnvironmentName,
            StartedAt = startedAt,
            UptimeSeconds = (long)(now - startedAt).TotalSeconds,
            AppVersion = Assembly.GetEntryAssembly()?.GetName().Version?.ToString() ?? "?",
            DotnetVersion = RuntimeInformation.FrameworkDescription,
            OsDescription = RuntimeInformation.OSDescription,
        };

        // DB bağlantısı + hafif sayaçlar (soft-delete global filtreye tabi).
        dto.DatabaseConnected = await context.Database.CanConnectAsync(cancellationToken);
        if (dto.DatabaseConnected)
        {
            dto.Counts = new SystemCountsDto
            {
                Users = await context.Users.CountAsync(cancellationToken),
                Transactions = await context.Transactions.CountAsync(cancellationToken),
                Households = await context.Households.CountAsync(cancellationToken),
            };
        }

        dto.Hangfire = ReadHangfireStatus();

        return ApiResponse<SystemStatusDto>.Success(dto);
    }

    private static HangfireStatusDto ReadHangfireStatus()
    {
        var status = new HangfireStatusDto();
        try
        {
            var stats = JobStorage.Current.GetMonitoringApi().GetStatistics();
            status.Succeeded = stats.Succeeded;
            status.Failed = stats.Failed;
            status.Processing = stats.Processing;
            status.Scheduled = stats.Scheduled;
            status.Enqueued = stats.Enqueued;
            status.Servers = (int)stats.Servers;
            status.Recurring = (int)stats.Recurring;

            using var connection = JobStorage.Current.GetConnection();
            status.Jobs = connection.GetRecurringJobs()
                .OrderBy(j => j.Id)
                .Select(j => new RecurringJobStatusDto
                {
                    Id = j.Id,
                    Cron = j.Cron,
                    LastExecution = j.LastExecution,
                    NextExecution = j.NextExecution,
                    LastState = j.LastJobState,
                })
                .ToList();
        }
        catch
        {
            // Hangfire storage geçici erişilemezse sistem durumu yine dönsün (boş Hangfire bloğu).
        }
        return status;
    }
}
