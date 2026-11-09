using Microsoft.Extensions.Logging;
using ParaRota.Application.DTOs.Receipts;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Infrastructure.Ocr;

/// <summary>
/// OCR fallback zinciri: önce Azure (free kotası yakılsın), kota/erişim sorununda Gemini.
/// Yalnızca 429 (kota/yoğunluk), 5xx (servis hatası) ve 503 (yapılandırılmamış) durumlarında
/// Gemini'ye düşülür. 400/413/422 (girdi sorunu) Azure sonucu olduğu gibi döner — Gemini denenmez.
/// </summary>
public class FallbackReceiptOcrService : IReceiptOcrService
{
    private readonly AzureReceiptOcrService _azure;
    private readonly GeminiReceiptOcrService _gemini;
    private readonly ILogger<FallbackReceiptOcrService> _logger;

    public FallbackReceiptOcrService(
        AzureReceiptOcrService azure,
        GeminiReceiptOcrService gemini,
        ILogger<FallbackReceiptOcrService> logger)
    {
        _azure = azure;
        _gemini = gemini;
        _logger = logger;
    }

    public async Task<ApiResponse<ScannedReceiptDto>> ScanAsync(Stream imageStream, string contentType, CancellationToken cancellationToken = default)
    {
        // İki sağlayıcıya da taze stream verebilmek için bir kez belleğe al.
        using var buffer = new MemoryStream();
        await imageStream.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();

        var azure = await _azure.ScanAsync(new MemoryStream(bytes), contentType, cancellationToken);
        if (azure.IsSuccess)
            return azure;

        if (!ShouldFallback(azure.StatusCode))
            return azure;

        _logger.LogInformation("Azure OCR {Status} → Gemini fallback devrede.", azure.StatusCode);
        var gemini = await _gemini.ScanAsync(new MemoryStream(bytes), contentType, cancellationToken);

        // Gemini de yapılandırılmamışsa (503) kullanıcıya Azure'ın orijinal hatasını döndür.
        if (!gemini.IsSuccess && gemini.StatusCode == 503)
            return azure;

        return gemini;
    }

    private static bool ShouldFallback(int statusCode)
        => statusCode is 429 or 503 || statusCode >= 500;
}
