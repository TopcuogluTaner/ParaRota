using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;

namespace ParaRota.Presentation.Filters;

/// <summary>
/// Sunucu tarafı premium zorunluluğu. Premium değilse aksiyonu çalıştırmadan
/// <c>403 + errorCode: PREMIUM_REQUIRED</c> döner. UI gizlemek yetmez — premium
/// uçlar API'de de korunur (kullanıcı 30g deneme içindeyse erişim açıktır).
///
/// Kullanım: aksiyon ya da controller üstüne <c>[RequirePremium]</c>. <c>[Authorize]</c>
/// ile birlikte kullanılmalı (kimliği doğrulanmamış istek zaten 401 olur).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class RequirePremiumAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var services = context.HttpContext.RequestServices;
        var currentUser = services.GetRequiredService<ICurrentUserService>();

        if (currentUser.UserId is null)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var subscriptions = services.GetRequiredService<ISubscriptionService>();
        var status = await subscriptions.GetPremiumStatusAsync(currentUser.UserId.Value, context.HttpContext.RequestAborted);

        if (!status.IsPremium)
        {
            context.Result = new ObjectResult(
                ApiResponse<object>.Fail(
                    "Bu özellik premium üyelik gerektirir.",
                    StatusCodes.Status403Forbidden,
                    errorCode: ErrorCodes.PremiumRequired))
            {
                StatusCode = StatusCodes.Status403Forbidden,
            };
            return;
        }

        await next();
    }
}
