using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MediatR;
using ParaRota.Application.DTOs.Investments;
using ParaRota.Application.Features.InvestmentFeatures.Commands.CreateHolding;
using ParaRota.Application.Features.InvestmentFeatures.Commands.DeleteHolding;
using ParaRota.Application.Features.InvestmentFeatures.Commands.SellHolding;
using ParaRota.Application.Features.InvestmentFeatures.Commands.UpdateHolding;
using ParaRota.Application.Features.InvestmentFeatures.Queries.GetPortfolio;
using ParaRota.Application.Services;
using ParaRota.Presentation.Abstraction;
using ParaRota.Presentation.Filters;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/investments")]
public class InvestmentsController(ISender sender, ICurrentUserService currentUser) : ApiController(sender)
{
    // NOT: [RequirePremium] sınıf seviyesinde DEĞİL — yalnız kullanıcı portföy uçlarında.
    // `rates` (genel kur panosu) ve `refresh-snapshots` (Admin bakım) premium gerektirmez;
    // sınıf seviyesi olsaydı premium olmayan Admin snapshot yenileyemezdi.
    [HttpGet("portfolio")]
    [RequirePremium]
    public async Task<IActionResult> GetPortfolio(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetPortfolioQuery(currentUser.UserId.Value), cancellationToken));
    }

    // Güncel kur panosu — tüm varlıkların (altın/döviz/kripto/hisse) en güncel kuru.
    [HttpGet("rates")]
    public async Task<IActionResult> GetRates([FromServices] IMarketDataService market, CancellationToken cancellationToken)
    {
        var rates = await market.GetRatesAsync(cancellationToken);
        return ToActionResult(ParaRota.Domain.Dtos.ApiResponse<IReadOnlyList<AssetRateDto>>.Success(rates));
    }

    // TEFAS fon kodu doğrulama + güncel pay değeri/adı — ekleme/alarm formu için.
    // Premium gerektirmez (yalnız doğrulama; varlık ekleme premium uçta korunur).
    [HttpGet("tefas/lookup")]
    public async Task<IActionResult> LookupTefasFund([FromQuery] string code, [FromServices] IMarketDataService market, CancellationToken cancellationToken)
    {
        var quote = await market.LookupTefasFundAsync(code ?? string.Empty, cancellationToken);
        return quote is null
            ? ToActionResult(ParaRota.Domain.Dtos.ApiResponse<TefasFundQuote>.Fail("Geçersiz TEFAS fon kodu.", 404, errorCode: ParaRota.Domain.Constants.ErrorCodes.FundCodeInvalid))
            : ToActionResult(ParaRota.Domain.Dtos.ApiResponse<TefasFundQuote>.Success(quote));
    }

    // TEFAS fon kodu/adına göre arama — mobil aramalı seçici için. Premium gerektirmez.
    [HttpGet("tefas/search")]
    public async Task<IActionResult> SearchTefasFunds([FromQuery] string q, [FromServices] IMarketDataService market, CancellationToken cancellationToken)
    {
        var results = await market.SearchTefasFundsAsync(q ?? string.Empty, cancellationToken);
        return ToActionResult(ParaRota.Domain.Dtos.ApiResponse<IReadOnlyList<TefasFundSummary>>.Success(results));
    }

    [HttpPost("holdings")]
    [RequirePremium]
    public async Task<IActionResult> Create([FromBody] CreateHoldingDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new CreateHoldingCommand(currentUser.UserId.Value, dto), cancellationToken));
    }

    [HttpPut("holdings/{id:int}")]
    [RequirePremium]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateHoldingDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new UpdateHoldingCommand(currentUser.UserId.Value, id, dto), cancellationToken));
    }

    [HttpPost("holdings/{id:int}/sell")]
    [RequirePremium]
    public async Task<IActionResult> Sell([FromRoute] int id, [FromBody] SellHoldingDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new SellHoldingCommand(currentUser.UserId.Value, id, dto), cancellationToken));
    }

    [HttpDelete("holdings/{id:int}")]
    [RequirePremium]
    public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new DeleteHoldingCommand(currentUser.UserId.Value, id), cancellationToken));
    }

    // Tüm varlıkların güncel fiyatını snapshot tablosuna yazar (16:00 Hangfire job'unun
    // manuel tetiği). Snapshot'ı olmayan varlıklar her portföy yüklemesinde canlı çekilip
    // ara sıra null dönebiliyor; bu uç bir kez çalıştırılınca hepsi cache'lenir.
    [HttpPost("refresh-snapshots")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RefreshSnapshots([FromServices] IMarketDataService market, CancellationToken cancellationToken)
    {
        var written = await market.RefreshSnapshotsAsync(cancellationToken);
        return Ok(new { written });
    }
}
