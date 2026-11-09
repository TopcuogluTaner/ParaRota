using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.Features.RentFeatures.Queries.GetRentIncrease;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/rent-increase")]
public class RentIncreaseController(ISender sender) : ApiController(sender)
{
    /// <summary>Yasal azami kira artışı — TÜFE 12 aylık ortalamalara göre değişim (TBK m.344).</summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] decimal currentRent, [FromQuery] int renewalMonth, [FromQuery] int renewalYear, CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new GetRentIncreaseQuery(currentRent, renewalMonth, renewalYear), cancellationToken));
}
