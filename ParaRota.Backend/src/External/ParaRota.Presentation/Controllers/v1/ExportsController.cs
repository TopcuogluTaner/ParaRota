using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.Exports;
using ParaRota.Application.Services;

namespace ParaRota.Presentation.Controllers.v1;

/// <summary>
/// Faz 4 — Raporlama / Export endpoint'leri. V1: aylık PDF, V2: işlem listesi Excel.
/// Plan: <c>docs/plans/reporting-export-faz4.md</c>.
/// </summary>
[ApiController]
[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("auth-standard")]
[Route("api/v{version:apiVersion}/exports")]
public class ExportsController(IExportService exportService, ICurrentUserService currentUser) : ControllerBase
{
    [HttpPost("monthly-pdf")]
    public async Task<IActionResult> MonthlyPdf([FromBody] MonthlyPdfRequest req, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        var bytes = await exportService.GenerateMonthlyPdfAsync(currentUser.UserId.Value, req, cancellationToken);
        // Dosya adı seçili ay(lar)dan kurulur — istemciler artık yalnız Months[] gönderiyor,
        // legacy req.Month çoğu istekte null kalıp "pararota-2026-.pdf" gibi bozuk ad üretiyordu.
        var months = req.Months.Count > 0 ? req.Months : (req.Month is int m ? [m] : new List<int>());
        var monthPart = months.Count switch
        {
            0 => "ozet",
            1 => $"{months[0]:D2}",
            _ => $"{months.Min():D2}-{months.Max():D2}",
        };
        var fileName = $"pararota-{req.Year}-{monthPart}.pdf";
        return File(bytes, "application/pdf", fileName);
    }

    [HttpPost("transactions-xlsx")]
    public async Task<IActionResult> TransactionsXlsx([FromBody] TransactionsXlsxRequest req, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        var bytes = await exportService.GenerateTransactionsXlsxAsync(currentUser.UserId.Value, req, cancellationToken);
        var fileName = $"pararota-transactions-{DateTime.Now:yyyyMMdd-HHmm}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }
}
