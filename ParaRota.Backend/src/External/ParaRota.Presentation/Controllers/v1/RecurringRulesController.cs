using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Application.Features.RecurringRuleFeatures.Commands.ApplyPayrollRaise;
using ParaRota.Application.Features.RecurringRuleFeatures.Commands.CreateRecurringRule;
using ParaRota.Application.Features.RecurringRuleFeatures.Commands.DeleteRecurringRule;
using ParaRota.Application.Features.RecurringRuleFeatures.Commands.RunRecurringRuleOnce;
using ParaRota.Application.Features.RecurringRuleFeatures.Commands.UpdateRecurringRule;
using ParaRota.Application.Features.RecurringRuleFeatures.Queries.GetRecurringRuleById;
using ParaRota.Application.Features.RecurringRuleFeatures.Queries.GetRecurringRules;
using ParaRota.Application.Features.RecurringRuleFeatures.Queries.GetSubscriptionRadar;
using ParaRota.Application.Services;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/recurring-rules")]
public class RecurringRulesController(ISender sender, ICurrentUserService currentUser) : ApiController(sender)
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? isActive, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetRecurringRulesQuery(currentUser.UserId.Value, isActive), cancellationToken));
    }

    /// <summary>Abonelik Radarı — abonelik kurallarının maliyet özeti + zam tespiti.</summary>
    [HttpGet("subscription-radar")]
    public async Task<IActionResult> SubscriptionRadar(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetSubscriptionRadarQuery(currentUser.UserId.Value), cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetRecurringRuleByIdQuery(currentUser.UserId.Value, id), cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRecurringRuleDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new CreateRecurringRuleCommand(currentUser.UserId.Value, dto), cancellationToken));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateRecurringRuleDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new UpdateRecurringRuleCommand(currentUser.UserId.Value, id, dto), cancellationToken));
    }

    // Maaş otomatiğine zam uygula — yürürlük ay/yılından itibaren yeni brüt geçerli olur.
    [HttpPost("{id:int}/payroll-raise")]
    public async Task<IActionResult> PayrollRaise([FromRoute] int id, [FromBody] PayrollRaiseDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new ApplyPayrollRaiseCommand(currentUser.UserId.Value, id, dto), cancellationToken));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new DeleteRecurringRuleCommand(currentUser.UserId.Value, id), cancellationToken));
    }

    /// <summary>Manuel "şimdi çalıştır" — Hangfire'ı beklemeden ilk transaction'ı üretir.</summary>
    [HttpPost("{id:int}/run-now")]
    public async Task<IActionResult> RunOnce([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new RunRecurringRuleOnceCommand(currentUser.UserId.Value, id), cancellationToken));
    }
}
