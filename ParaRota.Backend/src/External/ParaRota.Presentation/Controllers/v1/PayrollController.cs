using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MediatR;
using ParaRota.Application.DTOs.Payroll;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/payroll")]
public class PayrollController(ISender sender, IPayrollService payroll, ISeveranceCeilingService ceilings) : ApiController(sender)
{
    // Türkiye brüt→net: sabit aylık brüt için yılın 12 ayının net kırılımı (kümülatif vergi).
    [HttpGet("gross-to-net")]
    public IActionResult GrossToNet([FromQuery] decimal gross, [FromQuery] int year = 0, [FromQuery] int startMonth = 1)
    {
        var y = year > 0 ? year : payroll.SupportedYears.First();
        var result = payroll.ComputeYear(gross, y, startMonth);
        return ToActionResult(ApiResponse<PayrollResultDto>.Success(result));
    }

    [HttpGet("years")]
    public IActionResult Years()
        => ToActionResult(ApiResponse<IReadOnlyList<int>>.Success(payroll.SupportedYears));

    // Kıdem & ihbar tazminatı tahmini: işe giriş tarihi + brüt + kullanılmamış izin günü.
    // Tavan dönemleri DB'den (admin paneli) okunur; gerisi salt hesap.
    [HttpGet("severance")]
    public async Task<IActionResult> Severance([FromQuery] DateTime hireDate, [FromQuery] decimal gross, [FromQuery] int vacationDays = 0, CancellationToken cancellationToken = default)
    {
        if (gross <= 0)
            return ToActionResult(ApiResponse<SeveranceResultDto>.Fail("Brüt maaş pozitif olmalı.", 400, errorCode: ErrorCodes.SeveranceGrossPositive));
        // Eksik parametre default(DateTime)=0001-01-01'e bind olur → ~2000 yıllık kıdem
        // gibi absürt sonuç üretmesin; makul tarih penceresi zorunlu.
        if (hireDate == default || hireDate.Year < 1950 || hireDate > DateTime.Now)
            return ToActionResult(ApiResponse<SeveranceResultDto>.Fail("Geçerli bir işe giriş tarihi gerekli.", 400, errorCode: ErrorCodes.SeveranceHireDateInvalid));
        if (vacationDays is < 0 or > 366)
            return ToActionResult(ApiResponse<SeveranceResultDto>.Fail("İzin günü 0-366 aralığında olmalı.", 400, errorCode: ErrorCodes.SeveranceVacationInvalid));

        var periods = await ceilings.GetPeriodsAsync(cancellationToken);
        var result = payroll.ComputeSeverance(hireDate, gross, vacationDays, ceilings: periods);
        return ToActionResult(ApiResponse<SeveranceResultDto>.Success(result));
    }

    // ── Admin: kıdem tavanı yönetimi (yeni dönem deploy/kod gerektirmeden girilir) ──

    [HttpGet("severance-ceilings")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> AdminListCeilings(CancellationToken cancellationToken)
        => ToActionResult(await ceilings.AdminListAsync(cancellationToken));

    [HttpPost("severance-ceilings")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> AdminCreateCeiling([FromBody] CreateSeveranceCeilingDto dto, CancellationToken cancellationToken)
        => ToActionResult(await ceilings.AdminCreateAsync(dto, cancellationToken));

    [HttpPut("severance-ceilings/{id:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> AdminUpdateCeiling([FromRoute] int id, [FromBody] UpdateSeveranceCeilingDto dto, CancellationToken cancellationToken)
        => ToActionResult(await ceilings.AdminUpdateAsync(id, dto, cancellationToken));

    [HttpDelete("severance-ceilings/{id:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> AdminDeleteCeiling([FromRoute] int id, CancellationToken cancellationToken)
        => ToActionResult(await ceilings.AdminDeleteAsync(id, cancellationToken));
}
