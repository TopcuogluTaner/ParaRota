using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.Features.AiFeatures.Commands.ParseTransactionText;
using ParaRota.Application.Features.AiFeatures.Commands.ParseTransactionVoice;
using ParaRota.Application.Features.AiFeatures.Commands.TranscribeVoice;
using ParaRota.Application.Features.AiFeatures.Queries.GetMonthlyInsights;
using ParaRota.Application.Services;
using ParaRota.Presentation.Abstraction;
using ParaRota.Presentation.Filters;

namespace ParaRota.Presentation.Controllers.v1;

/// <summary>
/// AI asistanı (premium): doğal dilde işlem kaydı + aylık içgörüler.
/// Her çağrı Gemini kotası yakar → auth-standard rate limit + RequirePremium.
/// </summary>
[Authorize]
[RequirePremium]
[ApiVersion("1.0")]
[EnableRateLimiting("auth-standard")]
[Route("api/v{version:apiVersion}/ai")]
public class AiController(ISender sender, ICurrentUserService currentUser) : ApiController(sender)
{
    public sealed record ParseTextRequest(string Text, string? Language);

    /// <summary>"dün akşam 450 lira yemek" → işlem önerisi (form ön doldurma için).</summary>
    [HttpPost("parse-transaction")]
    public async Task<IActionResult> ParseTransaction([FromBody] ParseTextRequest body, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new ParseTransactionTextCommand(currentUser.UserId.Value, body.Text, body.Language), cancellationToken));
    }

    /// <summary>Bas-konuş: ses kaydı → işlem önerisi. Gemini sesi kendisi çözümler.</summary>
    [HttpPost("parse-voice")]
    [RequestSizeLimit(2 * 1024 * 1024)] // birkaç saniyelik m4a ~100-300KB; 2MB bol tavan
    public async Task<IActionResult> ParseVoice(IFormFile file, [FromForm] string? language, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        if (file is null || file.Length == 0)
            return ToActionResult(Domain.Dtos.ApiResponse<object>.Fail("Ses dosyası boş.", 400, errorCode: Domain.Constants.ErrorCodes.FileEmpty));

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, cancellationToken);
        var mime = NormalizeAudioMime(file.ContentType);
        return ToActionResult(await Sender.Send(new ParseTransactionVoiceCommand(currentUser.UserId.Value, ms.ToArray(), mime, language), cancellationToken));
    }

    // expo-audio m4a (AAC) üretir; Gemini'nin desteklediği mime'a normalize et.
    private static string NormalizeAudioMime(string? contentType) => (contentType ?? "").ToLowerInvariant() switch
    {
        "audio/wav" or "audio/x-wav" => "audio/wav",
        "audio/mpeg" or "audio/mp3" => "audio/mp3",
        "audio/ogg" => "audio/ogg",
        "audio/flac" => "audio/flac",
        _ => "audio/aac", // m4a / mp4 / aac → aac
    };

    /// <summary>Dikte: ses → yazı (kullanıcı kutuda düzenleyip kendisi gönderir).</summary>
    [HttpPost("transcribe")]
    [RequestSizeLimit(2 * 1024 * 1024)]
    public async Task<IActionResult> Transcribe(IFormFile file, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        if (file is null || file.Length == 0)
            return ToActionResult(Domain.Dtos.ApiResponse<object>.Fail("Ses dosyası boş.", 400, errorCode: Domain.Constants.ErrorCodes.FileEmpty));

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, cancellationToken);
        var mime = NormalizeAudioMime(file.ContentType);
        return ToActionResult(await Sender.Send(new TranscribeVoiceCommand(ms.ToArray(), mime), cancellationToken));
    }

    /// <summary>Aylık AI içgörüleri (aktif scope; 12 saat önbellekli).</summary>
    [HttpGet("insights/monthly")]
    public async Task<IActionResult> MonthlyInsights([FromQuery] int month, [FromQuery] int year, [FromQuery] string? language, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetMonthlyInsightsQuery(currentUser.UserId.Value, month, year, language), cancellationToken));
    }
}
