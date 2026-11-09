using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.SharedPots;
using ParaRota.Application.Services;
using ParaRota.Domain.Enums;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/shared-pots")]
public class SharedPotsController(ISender sender, ICurrentUserService currentUser, ISharedPotService service) : ApiController(sender)
{
    [HttpGet]
    public async Task<IActionResult> GetMine([FromQuery] SharedPotStatus? status, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.GetMyAsync(currentUser.UserId.Value, status, ct));
    }

    [HttpGet("candidates")]
    public async Task<IActionResult> Candidates(CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.GetMemberCandidatesAsync(currentUser.UserId.Value, ct));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Detail([FromRoute] int id, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.GetDetailAsync(currentUser.UserId.Value, id, ct));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSharedPotDto dto, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.CreateAsync(currentUser.UserId.Value, dto, ct));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateSharedPotDto dto, CancellationToken ct)
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

    [HttpPost("{id:int}/members")]
    public async Task<IActionResult> AddMember([FromRoute] int id, [FromBody] AddSharedPotMemberDto dto, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.AddMemberAsync(currentUser.UserId.Value, id, dto, ct));
    }

    [HttpDelete("{id:int}/members/{memberId:int}")]
    public async Task<IActionResult> RemoveMember([FromRoute] int id, [FromRoute] int memberId, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.RemoveMemberAsync(currentUser.UserId.Value, id, memberId, ct));
    }

    [HttpPost("{id:int}/expenses")]
    public async Task<IActionResult> AddExpense([FromRoute] int id, [FromBody] CreateSharedExpenseDto dto, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.AddExpenseAsync(currentUser.UserId.Value, id, dto, ct));
    }

    [HttpDelete("{id:int}/expenses/{expenseId:int}")]
    public async Task<IActionResult> DeleteExpense([FromRoute] int id, [FromRoute] int expenseId, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.DeleteExpenseAsync(currentUser.UserId.Value, id, expenseId, ct));
    }

    [HttpPost("{id:int}/settlements")]
    public async Task<IActionResult> AddSettlement([FromRoute] int id, [FromBody] CreateSettlementDto dto, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.AddSettlementAsync(currentUser.UserId.Value, id, dto, ct));
    }

    [HttpDelete("{id:int}/settlements/{settlementId:int}")]
    public async Task<IActionResult> DeleteSettlement([FromRoute] int id, [FromRoute] int settlementId, CancellationToken ct)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await service.DeleteSettlementAsync(currentUser.UserId.Value, id, settlementId, ct));
    }
}
