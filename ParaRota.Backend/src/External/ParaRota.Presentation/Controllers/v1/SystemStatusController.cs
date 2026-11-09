using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

/// <summary>Admin sistem durumu — çalışma zamanı + DB + Hangfire. Yalnız Admin.</summary>
[Authorize(Roles = AppRoles.Admin)]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/system-status")]
public class SystemStatusController(ISender sender, ISystemStatusService systemStatus) : ApiController(sender)
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
        => ToActionResult(await systemStatus.GetAsync(cancellationToken));
}
