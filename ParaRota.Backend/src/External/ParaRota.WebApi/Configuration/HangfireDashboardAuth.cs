using Hangfire.Dashboard;
using ParaRota.Domain.Constants;

namespace ParaRota.WebApi.Configuration;

/// <summary>
/// Hangfire dashboard erişim filtresi. Development'ta herkese açık,
/// Production'da yalnız Admin rolü.
/// </summary>
public class HangfireDashboardAuth : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        // Development'ta dashboard'a hızlı erişim için herkese açık.
        var env = httpContext.RequestServices
            .GetService<IWebHostEnvironment>()?.EnvironmentName ?? string.Empty;
        if (env.Equals("Development", StringComparison.OrdinalIgnoreCase))
            return true;

        // Production'da Admin rolü zorunlu. Authenticated user dahi olsa job
        // monitoring + manuel trigger yetkisi yalnız admin'e.
        return httpContext.User.Identity?.IsAuthenticated == true
            && httpContext.User.IsInRole(AppRoles.Admin);
    }
}
