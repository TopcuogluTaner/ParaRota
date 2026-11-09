using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ParaRota.Application;

namespace ParaRota.WebApi.Configuration;

public class ApplicationServiceInstaller : IServiceInstaller
{
    public void Install(IServiceCollection services, IConfiguration configuration)
        => services.AddApplication();
}
