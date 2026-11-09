using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.Notifications;
using ParaRota.Application.Features.NotificationFeatures.Commands.AdminDispatchNotification;
using ParaRota.Application.Features.NotificationFeatures.Commands.AdminTriggerMonthlyDigest;
using ParaRota.Application.Features.NotificationFeatures.Commands.DeleteNotification;
using ParaRota.Application.Features.NotificationFeatures.Commands.MarkAllNotificationsRead;
using ParaRota.Application.Features.NotificationFeatures.Commands.MarkNotificationRead;
using ParaRota.Application.Features.NotificationFeatures.Queries.GetRecentNotifications;
using ParaRota.Application.Features.NotificationFeatures.Queries.GetUnreadCount;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/notifications")]
public class NotificationsController(ISender sender, ICurrentUserService currentUser) : ApiController(sender)
{
    [HttpGet]
    public async Task<IActionResult> GetRecent([FromQuery] int take = 20, CancellationToken cancellationToken = default)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetRecentNotificationsQuery(currentUser.UserId.Value, take), cancellationToken));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetUnreadCountQuery(currentUser.UserId.Value), cancellationToken));
    }

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new MarkNotificationReadCommand(currentUser.UserId.Value, id), cancellationToken));
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new MarkAllNotificationsReadCommand(currentUser.UserId.Value), cancellationToken));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new DeleteNotificationCommand(currentUser.UserId.Value, id), cancellationToken));
    }

    /// <summary>[Admin only] Manuel bildirim gönderir (tek user / rol / broadcast).</summary>
    [HttpPost("admin/dispatch")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> AdminDispatch([FromBody] AdminDispatchNotificationDto body, CancellationToken cancellationToken)
    {
        return ToActionResult(await Sender.Send(new AdminDispatchNotificationCommand(body), cancellationToken));
    }

    /// <summary>[Admin only] Ay sonu karnesi job'ını elle tetikler (DedupKey sayesinde idempotent).</summary>
    [HttpPost("admin/monthly-digest")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> AdminTriggerMonthlyDigest(CancellationToken cancellationToken)
    {
        return ToActionResult(await Sender.Send(new AdminTriggerMonthlyDigestCommand(), cancellationToken));
    }
}
