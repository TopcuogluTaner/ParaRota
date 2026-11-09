using System.Text.Json;
using FluentValidation;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Persistence.Context;

namespace ParaRota.WebApi.Middleware;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ValidationException vex)
        {
            logger.LogWarning(vex, "Validation failed for {Path}", context.Request.Path);

            var errors = vex.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

            var response = ApiResponse<object>.Fail("Doğrulama hataları.", 400, errors, ErrorCodes.ValidationError);
            await WriteResponseAsync(context, response, 400);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception at {Path}", context.Request.Path);

            try
            {
                // Taze scope + taze DbContext: patlayan isteğin kendi context'i kullanılırsa
                // ChangeTracker'daki yarım kalmış iş verisi de flush olur (kısmi yazım) ve
                // hata DbUpdateException ise ErrorLog'un kendisi de kaybolurdu.
                await using var scope = context.RequestServices
                    .GetRequiredService<IServiceScopeFactory>()
                    .CreateAsyncScope();
                var logDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                logDb.ErrorLogs.Add(new ErrorLog
                {
                    Message = ex.Message,
                    StackTrace = ex.StackTrace,
                    Source = ex.Source,
                    RequestPath = context.Request.Path,
                    RequestMethod = context.Request.Method,
                    UserId = context.User?.Identity?.Name,
                    StatusCode = 500,
                });
                await logDb.SaveChangesAsync();
            }
            catch (Exception logEx)
            {
                logger.LogError(logEx, "ErrorLog kaydedilemedi");
            }

            var isDev = context.RequestServices
                .GetRequiredService<IHostEnvironment>().IsDevelopment();

            var message = isDev ? ex.Message : "Beklenmeyen bir hata oluştu.";
            await WriteResponseAsync(context, ApiResponse<object>.Fail(message, 500, errorCode: ErrorCodes.Unexpected), 500);
        }
    }

    private static Task WriteResponseAsync(HttpContext context, object body, int statusCode)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        var json = JsonSerializer.Serialize(body, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });
        return context.Response.WriteAsync(json);
    }
}
