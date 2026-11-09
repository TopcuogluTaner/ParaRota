using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.DeviceTokens;
using ParaRota.Application.Services;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/devices")]
public class DevicesController(
    ISender sender,
    ICurrentUserService currentUser,
    IDeviceTokenService deviceTokenService) : ApiController(sender)
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDeviceTokenDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await deviceTokenService.RegisterAsync(currentUser.UserId.Value, dto, cancellationToken));
    }

    [HttpDelete("{token}")]
    public async Task<IActionResult> Revoke([FromRoute] string token, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await deviceTokenService.RevokeAsync(currentUser.UserId.Value, token, cancellationToken));
    }
}
