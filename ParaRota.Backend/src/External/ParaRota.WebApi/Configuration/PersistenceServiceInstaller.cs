using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ParaRota.Persistence;

namespace ParaRota.WebApi.Configuration;

public class PersistenceServiceInstaller : IServiceInstaller
{
    public void Install(IServiceCollection services, IConfiguration configuration)
        => services.AddPersistence(configuration);
}
