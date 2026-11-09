using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ParaRota.Infrastructure;

namespace ParaRota.WebApi.Configuration;

public class InfrastructureServiceInstaller : IServiceInstaller
{
    public void Install(IServiceCollection services, IConfiguration configuration)
        => services.AddInfrastructure(configuration);
}
