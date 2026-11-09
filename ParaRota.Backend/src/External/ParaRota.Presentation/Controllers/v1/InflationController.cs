using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.Features.InflationFeatures.Queries.GetInflationConvert;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/inflation")]
public class InflationController(ISender sender) : ApiController(sender)
{
    /// <summary>Paranın değeri — tutarın TÜFE bazında iki tarih arası eşdeğeri (bitiş boşsa en güncel ay).</summary>
    [HttpGet("convert")]
    public async Task<IActionResult> Convert(
        [FromQuery] decimal amount, [FromQuery] int fromMonth, [FromQuery] int fromYear,
        [FromQuery] int? toMonth, [FromQuery] int? toYear, CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new GetInflationConvertQuery(amount, fromMonth, fromYear, toMonth, toYear), cancellationToken));
}
