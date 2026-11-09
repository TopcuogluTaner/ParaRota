using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.Goals;
using ParaRota.Application.Features.GoalFeatures.Commands.CreateGoal;
using ParaRota.Application.Features.GoalFeatures.Commands.DeleteGoal;
using ParaRota.Application.Features.GoalFeatures.Commands.UpdateGoal;
using ParaRota.Application.Features.GoalFeatures.Queries.GetGoalById;
using ParaRota.Application.Features.GoalFeatures.Queries.GetGoals;
using ParaRota.Application.Services;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/goals")]
public class GoalsController(ISender sender, ICurrentUserService currentUser) : ApiController(sender)
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetGoalsQuery(currentUser.UserId.Value), cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetGoalByIdQuery(currentUser.UserId.Value, id), cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGoalDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new CreateGoalCommand(currentUser.UserId.Value, dto), cancellationToken));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateGoalDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new UpdateGoalCommand(currentUser.UserId.Value, id, dto), cancellationToken));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new DeleteGoalCommand(currentUser.UserId.Value, id), cancellationToken));
    }
}
