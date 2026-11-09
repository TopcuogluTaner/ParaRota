namespace ParaRota.Application.DTOs.SystemStatus;

/// <summary>Admin "Sistem Durumu" ekranı — canlı çalışma zamanı + DB + Hangfire özeti.</summary>
public class SystemStatusDto
{
    // Çalışma zamanı
    public DateTime ServerTime { get; set; }
    public string TimeZone { get; set; } = string.Empty;     // TimeZoneInfo.Local.Id (TZ fix doğrulaması)
    public string Environment { get; set; } = string.Empty;  // Production / Development
    public DateTime StartedAt { get; set; }
    public long UptimeSeconds { get; set; }
    public string AppVersion { get; set; } = string.Empty;
    public string DotnetVersion { get; set; } = string.Empty;
    public string OsDescription { get; set; } = string.Empty;

    // Veritabanı
    public bool DatabaseConnected { get; set; }

    public HangfireStatusDto Hangfire { get; set; } = new();
    public SystemCountsDto Counts { get; set; } = new();
}

public class HangfireStatusDto
{
    public long Succeeded { get; set; }
    public long Failed { get; set; }
    public long Processing { get; set; }
    public long Scheduled { get; set; }
    public long Enqueued { get; set; }
    public int Servers { get; set; }
    public int Recurring { get; set; }
    public IReadOnlyList<RecurringJobStatusDto> Jobs { get; set; } = [];
}

public class RecurringJobStatusDto
{
    public string Id { get; set; } = string.Empty;
    public string? Cron { get; set; }
    public DateTime? LastExecution { get; set; }
    public DateTime? NextExecution { get; set; }
    public string? LastState { get; set; }     // Succeeded / Failed / Processing …
}

public class SystemCountsDto
{
    public int Users { get; set; }
    public int Transactions { get; set; }
    public int Households { get; set; }
}
