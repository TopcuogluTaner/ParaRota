using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.Transactions;
using ParaRota.Application.Features.TransactionFeatures.Commands.CreateTransaction;
using ParaRota.Application.Features.TransactionFeatures.Commands.DeleteTransaction;
using ParaRota.Application.Features.TransactionFeatures.Commands.MoveTransactionScope;
using ParaRota.Application.Features.TransactionFeatures.Commands.UpdateTransaction;
using ParaRota.Application.Features.TransactionFeatures.Queries.GetTransactionById;
using ParaRota.Application.Features.TransactionFeatures.Queries.GetTransactions;
using ParaRota.Application.Services;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/transactions")]
public class TransactionsController(ISender sender, ICurrentUserService currentUser) : ApiController(sender)
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] TransactionListParams query, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetTransactionsQuery(currentUser.UserId.Value, query), cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetTransactionByIdQuery(currentUser.UserId.Value, id), cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTransactionDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new CreateTransactionCommand(currentUser.UserId.Value, dto), cancellationToken));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateTransactionDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new UpdateTransactionCommand(currentUser.UserId.Value, id, dto), cancellationToken));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new DeleteTransactionCommand(currentUser.UserId.Value, id), cancellationToken));
    }

    [HttpPatch("{id:int}/scope")]
    public async Task<IActionResult> MoveScope([FromRoute] int id, [FromBody] MoveTransactionScopeDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new MoveTransactionScopeCommand(currentUser.UserId.Value, id, dto), cancellationToken));
    }
}
