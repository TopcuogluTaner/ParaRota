using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.GoldDays;
using ParaRota.Application.Services;
using ParaRota.Domain.Enums;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/gold-days")]
public class GoldDaysController(ISender sender, ICurrentUserService currentUser, IGoldDayService service) : ApiController(sender)
{
    [HttpGet]
    public async Task<IActionResult> GetMine([FromQuery] GoldDayStatus? status, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.GetMyAsync(currentUser.UserId.Value, status, ct));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById([FromRoute] int id, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.GetByIdAsync(currentUser.UserId.Value, id, ct));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGoldDayDto dto, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.CreateAsync(currentUser.UserId.Value, dto, ct));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateGoldDayDto dto, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.UpdateAsync(currentUser.UserId.Value, id, dto, ct));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.DeleteAsync(currentUser.UserId.Value, id, ct));
    }

    [HttpPost("contributions/{contributionId:int}/paid")]
    public async Task<IActionResult> SetContributionPaid([FromRoute] int contributionId, [FromBody] SetContributionPaidDto dto, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.SetContributionPaidAsync(currentUser.UserId.Value, contributionId, dto.IsPaid, ct));
    }

    [HttpPost("meetings/{meetingId:int}/completed")]
    public async Task<IActionResult> SetMeetingCompleted([FromRoute] int meetingId, [FromBody] SetMeetingCompletedDto dto, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.SetMeetingCompletedAsync(currentUser.UserId.Value, meetingId, dto.IsCompleted, ct));
    }
}
