using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.PriceAlarms;
using ParaRota.Application.Services;
using ParaRota.Domain.Enums;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/price-alarms")]
public class PriceAlarmsController(ISender sender, ICurrentUserService currentUser, IPriceAlarmService service) : ApiController(sender)
{
    [HttpGet]
    public async Task<IActionResult> GetMine([FromQuery] AlarmStatus? status, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.GetMyAsync(currentUser.UserId.Value, status, ct));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePriceAlarmDto dto, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.CreateAsync(currentUser.UserId.Value, dto, ct));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdatePriceAlarmDto dto, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.UpdateAsync(currentUser.UserId.Value, id, dto, ct));
    }

    [HttpPost("{id:int}/rearm")]
    public async Task<IActionResult> Rearm([FromRoute] int id, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.RearmAsync(currentUser.UserId.Value, id, ct));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.DeleteAsync(currentUser.UserId.Value, id, ct));
    }
}
