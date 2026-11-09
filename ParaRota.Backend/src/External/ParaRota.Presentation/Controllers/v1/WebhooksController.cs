using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ParaRota.Application.DTOs.Subscriptions;
using ParaRota.Application.Services;

namespace ParaRota.Presentation.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/webhooks")]
public class WebhooksController(
    ISubscriptionService subscriptionService,
    IConfiguration configuration,
    ILogger<WebhooksController> logger) : ControllerBase
{
    /// <summary>
    /// RevenueCat → backend abonelik olayları. <see cref="AllowAnonymousAttribute"/> (JWT yok);
    /// güvenlik <c>Authorization</c> header'ının config secret ile eşleşmesiyle sağlanır.
    /// Olay ne olursa olsun 200 döneriz (RevenueCat retry kuyruğunu şişirmemek için) — yalnız
    /// secret eşleşmezse 401.
    /// </summary>
    [HttpPost("revenuecat")]
    [AllowAnonymous]
    [EnableRateLimiting("api-general")]
    public async Task<IActionResult> RevenueCat([FromBody] RevenueCatWebhookPayload payload, CancellationToken cancellationToken)
    {
        var expected = configuration["RevenueCat:WebhookAuthHeader"];

        // Secret yapılandırılmamışsa webhook'u kapalı kabul et (yanlışlıkla açık kalmasın).
        if (string.IsNullOrWhiteSpace(expected))
        {
            logger.LogWarning("RevenueCat webhook çağrıldı ama WebhookAuthHeader yapılandırılmamış — reddedildi.");
            return Unauthorized();
        }

        var provided = Request.Headers.Authorization.ToString();
        if (!FixedTimeEquals(provided, expected))
        {
            logger.LogWarning("RevenueCat webhook: Authorization header eşleşmedi — reddedildi.");
            return Unauthorized();
        }

        // Sandbox satın almaları (TestFlight / iOS sandbox / Play test) gerçek premium yazmasın.
        // Sandbox'ı uçtan uca test ederken geçici olarak config: RevenueCat:ProcessSandboxEvents=true.
        if (string.Equals(payload.Event?.Environment, "SANDBOX", StringComparison.OrdinalIgnoreCase)
            && !configuration.GetValue<bool>("RevenueCat:ProcessSandboxEvents"))
        {
            logger.LogInformation(
                "RevenueCat webhook: SANDBOX olayı yoksayıldı (ProcessSandboxEvents=false). type={Type} appUserId={AppUserId}",
                payload.Event?.Type, payload.Event?.AppUserId);
            return Ok();
        }

        try
        {
            await subscriptionService.ApplyWebhookAsync(payload, cancellationToken);
        }
        catch (Exception ex)
        {
            // 500 dönersek RevenueCat tekrar dener; geçici DB hatası gibi durumlarda bu istenir.
            logger.LogError(ex, "RevenueCat webhook işlenirken hata.");
            return StatusCode(500);
        }

        return Ok();
    }

    private static bool FixedTimeEquals(string? a, string? b)
    {
        if (a is null || b is null) return false;
        var ba = System.Text.Encoding.UTF8.GetBytes(a);
        var bb = System.Text.Encoding.UTF8.GetBytes(b);
        return System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(ba, bb);
    }
}
