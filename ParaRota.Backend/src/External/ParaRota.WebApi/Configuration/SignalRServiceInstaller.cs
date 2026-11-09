using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ParaRota.Application.Services;
using ParaRota.WebApi.Hubs;

namespace ParaRota.WebApi.Configuration;

public class SignalRServiceInstaller : IServiceInstaller
{
    public void Install(IServiceCollection services, IConfiguration configuration)
    {
        services.AddSignalR();

        // Tek-instance bağlantı takibi (in-memory). Scale-out için Redis backplane gerekir.
        services.AddSingleton<IConnectionTracker, InMemoryConnectionTracker>();

        // HubContext kullanır — scoped + transient da olabilir; SignalR HubContext singleton'dır,
        // bu wrapper hafif olduğu için scoped tutuyoruz (dispatcher zaten scoped).
        services.AddScoped<IRealtimePusher, SignalRRealtimePusher>();

        // Clients.User(userId) için JWT sub → connection user identifier eşlemesi.
        services.AddSingleton<IUserIdProvider, JwtUserIdProvider>();
    }
}
