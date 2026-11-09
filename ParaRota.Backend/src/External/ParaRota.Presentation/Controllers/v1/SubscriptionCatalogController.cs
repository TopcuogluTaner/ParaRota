using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.SubscriptionCatalog;
using ParaRota.Application.Features.SubscriptionCatalogFeatures.Commands.AdminCreateSubscriptionCatalogItem;
using ParaRota.Application.Features.SubscriptionCatalogFeatures.Commands.AdminDeleteSubscriptionCatalogItem;
using ParaRota.Application.Features.SubscriptionCatalogFeatures.Commands.AdminUpdateSubscriptionCatalogItem;
using ParaRota.Application.Features.SubscriptionCatalogFeatures.Queries.AdminListSubscriptionCatalog;
using ParaRota.Application.Features.SubscriptionCatalogFeatures.Queries.GetSubscriptionCatalog;
using ParaRota.Domain.Constants;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/subscription-catalog")]
public class SubscriptionCatalogController(ISender sender) : ApiController(sender)
{
    /// <summary>Popüler abonelikler şeridi — aktif item'lar + sistem "Abonelikler" kategori id'si.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new GetSubscriptionCatalogQuery(), cancellationToken));

    // ── Admin: katalog yönetimi (fiyat güncelleme deploy gerektirmesin) ──

    [HttpGet("admin")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> AdminList(CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new AdminListSubscriptionCatalogQuery(), cancellationToken));

    [HttpPost("admin")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> AdminCreate([FromBody] CreateSubscriptionCatalogItemDto dto, CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new AdminCreateSubscriptionCatalogItemCommand(dto), cancellationToken));

    [HttpPut("admin/{id:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> AdminUpdate([FromRoute] int id, [FromBody] UpdateSubscriptionCatalogItemDto dto, CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new AdminUpdateSubscriptionCatalogItemCommand(id, dto), cancellationToken));

    [HttpDelete("admin/{id:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> AdminDelete([FromRoute] int id, CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new AdminDeleteSubscriptionCatalogItemCommand(id), cancellationToken));
}
