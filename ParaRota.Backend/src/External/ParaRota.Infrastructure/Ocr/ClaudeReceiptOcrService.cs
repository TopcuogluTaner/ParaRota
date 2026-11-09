using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using ParaRota.Application.DTOs.Receipts;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Infrastructure.Ai;

namespace ParaRota.Infrastructure.Ocr;

/// <summary>
/// Claude (Anthropic) vision ile fiş parse eder. Görseli base64 inline yollar, "yalnız JSON"
/// yönergesiyle yapısal yanıt alıp ScannedReceiptDto'ya çevirir. Anthropic anahtarı yoksa veya
/// biçim Claude vision'ın desteklemediği bir tür ise (HEIC/HEIF) Gemini OCR'a düşer.
/// </summary>
public class ClaudeReceiptOcrService(
    AnthropicClient anthropic,
    GeminiReceiptOcrService geminiFallback,
    ILogger<ClaudeReceiptOcrService> logger) : IReceiptOcrService
{
    private const string Prompt =
        "Bu bir alışveriş fişi/makbuz görseli. Alanları çıkar ve YALNIZCA şu JSON nesnesini döndür " +
        "(markdown/açıklama yok): {\"merchantName\":string|null, \"merchantAddress\":string|null, " +
        "\"merchantPhone\":string|null, \"transactionDate\":string|null, \"total\":number|null, " +
        "\"subtotal\":number|null, \"tax\":number|null, \"currency\":string|null, \"receiptType\":string|null, " +
        "\"items\":[{\"name\":string|null,\"quantity\":number|null,\"price\":number|null,\"totalPrice\":number|null}]}. " +
        "Para birimini ISO 4217 koduna çevir (₺/TL → TRY, $ → USD, € → EUR). transactionDate ISO 8601 (yyyy-MM-dd). " +
        "Tutarlar ondalık sayı (binlik ayraç yok). Bir alan fişte yoksa null bırak. Uydurma yapma.";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
    };

    public async Task<ApiResponse<ScannedReceiptDto>> ScanAsync(Stream imageStream, string contentType, CancellationToken cancellationToken = default)
    {
        // Anthropic yapılandırılmamış → eski yol (Gemini) aynen çalışsın.
        if (!anthropic.IsConfigured)
            return await geminiFallback.ScanAsync(imageStream, contentType, cancellationToken);

        var (blockType, mediaType) = MapClaudeMedia(contentType);
        // Claude vision HEIC/HEIF desteklemez → o tür gelirse Gemini'ye düş (stream'i baştan ver).
        if (blockType is null)
        {
            logger.LogInformation("Claude vision {ContentType} desteklemiyor → Gemini OCR fallback.", contentType);
            return await geminiFallback.ScanAsync(imageStream, contentType, cancellationToken);
        }

        using var ms = new MemoryStream();
        await imageStream.CopyToAsync(ms, cancellationToken);
        var bytes = ms.ToArray();
        var base64 = Convert.ToBase64String(bytes);

        var content = new object[]
        {
            new { type = blockType, source = new { type = "base64", media_type = mediaType, data = base64 } },
            new { type = "text", text = Prompt },
        };

        var r = await anthropic.CreateMessageAsync(content, system: null, maxTokens: 1536, cancellationToken);

        // Claude hata verdiyse → Gemini'ye düş (otomatik failover, taze stream ile).
        if (!r.Ok)
        {
            logger.LogInformation("Claude OCR başarısız (status={Status}) → Gemini OCR fallback.", r.Status);
            return await geminiFallback.ScanAsync(new MemoryStream(bytes), contentType, cancellationToken);
        }

        ClaudeReceipt? parsed = null;
        try
        {
            parsed = JsonSerializer.Deserialize<ClaudeReceipt>(r.Text!, JsonOpts);
        }
        catch (JsonException)
        {
            logger.LogWarning("Claude OCR yanıtı JSON'a çevrilemedi.");
        }

        // Parse edilemedi/boş → veriyi yine de almak için Gemini'ye düş.
        if (parsed is null)
        {
            logger.LogInformation("Claude OCR JSON boş/geçersiz → Gemini OCR fallback.");
            return await geminiFallback.ScanAsync(new MemoryStream(bytes), contentType, cancellationToken);
        }

        var dto = new ScannedReceiptDto
        {
            MerchantName = parsed.MerchantName,
            MerchantAddress = parsed.MerchantAddress,
            MerchantPhone = parsed.MerchantPhone,
            TransactionDate = ParseDate(parsed.TransactionDate),
            Total = parsed.Total,
            Subtotal = parsed.Subtotal,
            Tax = parsed.Tax,
            Currency = parsed.Currency,
            ReceiptType = parsed.ReceiptType,
            Confidence = null, // Claude güven skoru vermez.
            Items = parsed.Items?.Select(i => new ScannedReceiptItemDto
            {
                Name = i.Name,
                Quantity = i.Quantity,
                Price = i.Price,
                TotalPrice = i.TotalPrice,
            }).ToList() ?? new List<ScannedReceiptItemDto>(),
        };

        return ApiResponse<ScannedReceiptDto>.Success(dto, "Fiş tarandı.");
    }

    // Claude vision: image/jpeg|png|gif|webp ve application/pdf (document). HEIC/HEIF yok → null.
    private static (string? BlockType, string MediaType) MapClaudeMedia(string contentType)
    {
        var ct = contentType?.Trim().ToLowerInvariant();
        return ct switch
        {
            "image/jpeg" or "image/jpg" => ("image", "image/jpeg"),
            "image/png" => ("image", "image/png"),
            "image/gif" => ("image", "image/gif"),
            "image/webp" => ("image", "image/webp"),
            "application/pdf" => ("document", "application/pdf"),
            _ => (null, string.Empty),
        };
    }

    private static DateTime? ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d : null;
    }

    private sealed class ClaudeReceipt
    {
        public string? MerchantName { get; set; }
        public string? MerchantAddress { get; set; }
        public string? MerchantPhone { get; set; }
        public string? TransactionDate { get; set; }
        public decimal? Total { get; set; }
        public decimal? Subtotal { get; set; }
        public decimal? Tax { get; set; }
        public string? Currency { get; set; }
        public string? ReceiptType { get; set; }
        public List<ClaudeReceiptItem>? Items { get; set; }
    }

    private sealed class ClaudeReceiptItem
    {
        public string? Name { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? Price { get; set; }
        public decimal? TotalPrice { get; set; }
    }
}
