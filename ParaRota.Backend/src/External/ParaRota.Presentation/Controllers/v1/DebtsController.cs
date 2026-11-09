using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.Debts;
using ParaRota.Application.Features.DebtFeatures.Commands.AddDebtPayment;
using ParaRota.Application.Features.DebtFeatures.Commands.CreateDebt;
using ParaRota.Application.Features.DebtFeatures.Commands.DeleteDebt;
using ParaRota.Application.Features.DebtFeatures.Commands.UpdateDebt;
using ParaRota.Application.Features.DebtFeatures.Queries.GetDebtById;
using ParaRota.Application.Features.DebtFeatures.Queries.GetMyDebts;
using ParaRota.Application.Services;
using ParaRota.Domain.Enums;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/debts")]
public class DebtsController(ISender sender, ICurrentUserService currentUser) : ApiController(sender)
{
    [HttpGet]
    public async Task<IActionResult> GetMine([FromQuery] DebtStatus? status, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetMyDebtsQuery(currentUser.UserId.Value, status), cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetDebtByIdQuery(currentUser.UserId.Value, id), cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDebtDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new CreateDebtCommand(currentUser.UserId.Value, dto), cancellationToken));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateDebtDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new UpdateDebtCommand(currentUser.UserId.Value, id, dto), cancellationToken));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new DeleteDebtCommand(currentUser.UserId.Value, id), cancellationToken));
    }

    [HttpPost("{id:int}/payments")]
    public async Task<IActionResult> AddPayment([FromRoute] int id, [FromBody] AddDebtPaymentDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new AddDebtPaymentCommand(currentUser.UserId.Value, id, dto), cancellationToken));
    }
}
