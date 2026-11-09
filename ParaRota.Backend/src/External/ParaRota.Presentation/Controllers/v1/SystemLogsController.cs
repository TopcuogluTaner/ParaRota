using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.SystemLogs;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

/// <summary>Admin sistem logları — ExceptionMiddleware'in ErrorLog kayıtları. Yalnız Admin.</summary>
[Authorize(Roles = AppRoles.Admin)]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/system-logs")]
public class SystemLogsController(ISender sender, ISystemLogService systemLogs) : ApiController(sender)
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] SystemLogListParams query, CancellationToken cancellationToken)
        => ToActionResult(await systemLogs.GetErrorLogsAsync(query, cancellationToken));

    [HttpDelete]
    public async Task<IActionResult> ClearAll(CancellationToken cancellationToken)
        => ToActionResult(await systemLogs.ClearAllAsync(cancellationToken));
}
