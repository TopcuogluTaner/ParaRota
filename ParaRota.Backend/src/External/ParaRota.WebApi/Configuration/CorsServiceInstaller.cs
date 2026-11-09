using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ParaRota.WebApi.Configuration;

public class CorsServiceInstaller : IServiceInstaller
{
    public const string PolicyName = "ParaRotaCors";

    public void Install(IServiceCollection services, IConfiguration configuration)
    {
        var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                      ?? new[] { "http://localhost:5173" };

        services.AddCors(o => o.AddPolicy(PolicyName, p =>
            p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
    }
}
