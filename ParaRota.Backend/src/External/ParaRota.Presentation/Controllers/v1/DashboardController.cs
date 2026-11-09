using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.Features.DashboardFeatures.Queries.GetDashboardSummary;
using ParaRota.Application.Features.DashboardFeatures.Queries.GetCashflowForecast;
using ParaRota.Application.Features.DashboardFeatures.Queries.GetInsights;
using ParaRota.Application.Services;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/dashboard")]
public class DashboardController(ISender sender, ICurrentUserService currentUser) : ApiController(sender)
{
    /// <summary>
    /// Dashboard'un tek HTTP isteğinde tüm verisi: ay aggregates + 6 aylık trend +
    /// kategori dağılımı + yaklaşan + son hareketler.
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] int? month, [FromQuery] int? year, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetDashboardSummaryQuery(currentUser.UserId.Value, month, year), cancellationToken));
    }

    /// <summary>Nakit akışı tahmini — bu ayın gerçekleşeni + ay sonuna kadar planlanan tekrarlayan akışlar.</summary>
    [HttpGet("cashflow")]
    public async Task<IActionResult> Cashflow(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetCashflowForecastQuery(currentUser.UserId.Value), cancellationToken));
    }

    /// <summary>Kural bazlı içgörüler — bu aya göre en fazla 3 kayıt (key+params; çeviri frontend'de).</summary>
    [HttpGet("insights")]
    public async Task<IActionResult> Insights(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetInsightsQuery(currentUser.UserId.Value), cancellationToken));
    }
}
