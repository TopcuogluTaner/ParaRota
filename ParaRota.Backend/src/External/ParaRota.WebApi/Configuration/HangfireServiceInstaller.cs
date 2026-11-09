using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ParaRota.WebApi.Configuration;

public class HangfireServiceInstaller : IServiceInstaller
{
    public void Install(IServiceCollection services, IConfiguration configuration)
    {
        var environment = configuration["AppSettings:Environment"] ?? "TEST";
        var connectionString =
            configuration[$"EnvConfig:{environment}:ConnectionStrings:DefaultConnection"]
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string bulunamadı.");

        services.AddHangfire(config =>
        {
            config.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                  .UseSimpleAssemblyNameTypeSerializer()
                  .UseRecommendedSerializerSettings()
                  .UsePostgreSqlStorage(opt => opt.UseNpgsqlConnection(connectionString));
        });

        services.AddHangfireServer(options =>
        {
            options.WorkerCount = 2; // Tek kullanıcılı app, az job — küçük worker pool yeter.
            options.ServerName = $"pararota-{Environment.MachineName}";
        });

        // Sistem durumu toplayıcısı — Hangfire (JobStorage) + DbContext + host bilgisine eriştiği
        // için WebApi'de yaşar; interface Application'da, controller Presentation'da (DI runtime bağlar).
        services.AddScoped<Application.Services.ISystemStatusService, Services.SystemStatusService>();
    }
}
