using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.Features.LoanFeatures.Queries.GetLoanCost;
using ParaRota.Domain.Enums;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/loan-cost")]
public class LoanController(ISender sender) : ApiController(sender)
{
    /// <summary>Kredi gerçek maliyeti — faiz + KKDF + BSMV dahil taksit, toplam maliyet, gerçek yıllık oran, ödeme planı.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] decimal amount, [FromQuery] decimal monthlyRatePercent, [FromQuery] int termMonths,
        [FromQuery] LoanType? loanType, [FromQuery] decimal dosyaMasrafi, CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new GetLoanCostQuery(amount, monthlyRatePercent, termMonths, loanType, dosyaMasrafi), cancellationToken));
}
