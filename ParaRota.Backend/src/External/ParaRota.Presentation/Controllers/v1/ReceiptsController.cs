using System.Text;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.Receipts;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Presentation.Filters;

namespace ParaRota.Presentation.Controllers.v1;

[ApiController]
[Authorize]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/receipts")]
public class ReceiptsController(IReceiptOcrService ocrService, ICurrentUserService currentUser) : ControllerBase
{
    // 4MB upper limit — Azure DI prebuilt-receipt için yeterli, daha büyüğü reddet
    private const long MaxFileSize = 4 * 1024 * 1024;
    private const int HeaderBytesToRead = 16;

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif",
        "application/pdf",
    };

    [HttpPost("scan")]
    [RequirePremium]
    [EnableRateLimiting("auth-standard")]
    [RequestSizeLimit(MaxFileSize)]
    public async Task<IActionResult> Scan(IFormFile file, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<ScannedReceiptDto>.Fail("Dosya boş.", 400, errorCode: ErrorCodes.FileEmpty));
        if (file.Length > MaxFileSize)
            return BadRequest(ApiResponse<ScannedReceiptDto>.Fail("Dosya 4MB sınırını aşıyor.", 400, errorCode: ErrorCodes.FileTooLarge));
        var ct = file.ContentType?.ToLowerInvariant() ?? string.Empty;
        if (!AllowedContentTypes.Contains(ct))
            return BadRequest(ApiResponse<ScannedReceiptDto>.Fail($"Desteklenmeyen dosya tipi: {ct}", 415, errorCode: ErrorCodes.FileTypeUnsupported));

        await using var stream = file.OpenReadStream();

        // Magic bytes doğrulaması: Content-Type header'a güvenmek yeterli değil,
        // saldırgan `image/jpeg` MIME ile rastgele payload yollayabilir. Stream'in
        // ilk 16 byte'ını okuyup dosya imzasını eşle.
        var header = new byte[HeaderBytesToRead];
        var read = await stream.ReadAsync(header.AsMemory(0, HeaderBytesToRead), cancellationToken);
        if (read < 4)
            return BadRequest(ApiResponse<ScannedReceiptDto>.Fail("Dosya başlığı okunamadı.", 400, errorCode: ErrorCodes.FileHeaderUnreadable));

        var detected = DetectFileSignature(header, read);
        if (detected is null)
            return StatusCode(415, ApiResponse<ScannedReceiptDto>.Fail("Dosya imzası tanınmadı; desteklenen formatlar: jpg/png/pdf/heic/heif.", 415, errorCode: ErrorCodes.FileSignatureUnknown));
        if (!IsCompatibleMime(ct, detected))
            return StatusCode(415, ApiResponse<ScannedReceiptDto>.Fail($"MIME tipi ({ct}) dosya imzasıyla ({detected}) uyumsuz.", 415, errorCode: ErrorCodes.FileMimeMismatch));

        if (stream.CanSeek)
            stream.Position = 0;
        else
            return StatusCode(500, ApiResponse<ScannedReceiptDto>.Fail("Dosya stream sıfırlanamadı.", 500, errorCode: ErrorCodes.FileStreamResetFailed));

        var result = await ocrService.ScanAsync(stream, detected, cancellationToken);
        return StatusCode(result.StatusCode == 0 ? (result.IsSuccess ? 200 : 400) : result.StatusCode, result);
    }

    /// <summary>
    /// Header byte'larından dosya tipini tespit eder. null → tanınmadı.
    /// </summary>
    private static string? DetectFileSignature(byte[] header, int length)
    {
        if (length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            return "image/jpeg";
        if (length >= 8 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47
                        && header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A)
            return "image/png";
        if (length >= 5 && header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46
                        && header[4] == 0x2D)
            return "application/pdf";
        // HEIF/HEIC: offset 4'te "ftyp" box, brand bytes 8-11.
        if (length >= 12 && header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70)
        {
            var brand = Encoding.ASCII.GetString(header, 8, 4);
            if (brand is "heic" or "heix" or "heim" or "heis") return "image/heic";
            if (brand is "mif1" or "msf1" or "hevc" or "hevx") return "image/heif";
        }
        return null;
    }

    /// <summary>
    /// Client'ın MIME header'ı ile gerçek imza uyumlu mu? jpg/jpeg eşdeğer kabul edilir.
    /// </summary>
    private static bool IsCompatibleMime(string clientMime, string detectedMime)
    {
        if (string.Equals(clientMime, detectedMime, StringComparison.OrdinalIgnoreCase)) return true;
        if (detectedMime == "image/jpeg" && clientMime is "image/jpeg" or "image/jpg") return true;
        // HEIC/HEIF brand'leri arasında client'ın hangi MIME yolladığını çok şart koşmuyoruz.
        if ((detectedMime == "image/heic" || detectedMime == "image/heif")
            && (clientMime == "image/heic" || clientMime == "image/heif")) return true;
        return false;
    }
}
