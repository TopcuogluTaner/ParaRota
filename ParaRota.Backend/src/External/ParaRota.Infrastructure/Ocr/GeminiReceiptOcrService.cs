using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ParaRota.Application.DTOs.Receipts;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;

namespace ParaRota.Infrastructure.Ocr;

/// <summary>
/// Gemini Flash görsel modeliyle fiş parse eder. Azure prebuilt-receipt fallback'i:
/// görseli inline base64 yollar, responseSchema ile yapısal JSON alıp ScannedReceiptDto'ya çevirir.
/// </summary>
public class GeminiReceiptOcrService : IReceiptOcrService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GeminiReceiptOcrService> _logger;
    private readonly GeminiSettings _settings;

    private const string Prompt =
        "Bu bir alışveriş fişi/makbuz görseli. Alanları çıkar ve yalnızca verilen JSON şemasına uygun yanıt ver. " +
        "Para birimini ISO 4217 koduna çevir (₺/TL → TRY, $ → USD, € → EUR). transactionDate ISO 8601 (yyyy-MM-dd). " +
        "Tutarlar ondalık sayı (binlik ayraç yok). Bir alan fişte yoksa null bırak. Uydurma yapma.";

    public GeminiReceiptOcrService(
        IHttpClientFactory httpClientFactory,
        IOptions<GeminiSettings> settings,
        ILogger<GeminiReceiptOcrService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _settings = settings.Value;
    }

    // Ücretsiz yedek model: yapılandırılan model 503/429 verince denenir (ayrı kota
    // kovası). flash-lite ~1000/gün, flash ~250/gün; ikisi de free-tier'da fiş okur.
    private const string FallbackModel = "gemini-2.5-flash";
    private const int MaxAttemptsPerModel = 2; // ilk + 1 retry (yalnız 503 için)
    private const int BackoffMs = 800;

    public async Task<ApiResponse<ScannedReceiptDto>> ScanAsync(Stream imageStream, string contentType, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
            return ApiResponse<ScannedReceiptDto>.Fail("Gemini OCR yapılandırılmamış.", 503, errorCode: ErrorCodes.OcrNotConfigured);

        try
        {
            using var ms = new MemoryStream();
            await imageStream.CopyToAsync(ms, cancellationToken);
            var base64 = Convert.ToBase64String(ms.ToArray());
            var mime = NormalizeMime(contentType);

            // Denenecek modeller: yapılandırılan model + ücretsiz yedek (tekrarsız).
            var models = new[] { _settings.Model, FallbackModel }
                .Where(m => !string.IsNullOrWhiteSpace(m))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var client = _httpClientFactory.CreateClient("ai");
            var lastStatus = 502;

            foreach (var model in models)
            {
                for (var attempt = 0; attempt < MaxAttemptsPerModel; attempt++)
                {
                    if (attempt > 0)
                        await Task.Delay(BackoffMs * attempt, cancellationToken); // 800ms, 1600ms…

                    var r = await TryOnceAsync(client, model, mime, base64, cancellationToken);
                    if (r.Success)
                        return ApiResponse<ScannedReceiptDto>.Success(r.Dto!, "Fiş tarandı.");

                    lastStatus = r.Status;

                    // Girdi/yetki sorunları (422 veri yok, 401/403) → retry/fallback anlamsız.
                    if (r.Terminal)
                        return ApiResponse<ScannedReceiptDto>.Fail(r.Message!, r.Status, errorCode: r.ErrorCode!);

                    // 503 (high demand) geçicidir → aynı modelde tekrar dene; diğer
                    // hatalarda (429 kota vb.) bu modeli bırakıp sonraki modele geç.
                    if (r.Status != 503) break;
                }
            }

            _logger.LogError("Gemini OCR tüm denemeler tükendi: lastStatus={Status} models={Models}", lastStatus, string.Join(",", models));
            var userStatus = lastStatus switch
            {
                429 => 429,
                // Free-tier "high demand" → 503'ü koru ki kullanıcı "yoğun, tekrar dene"
                // (anlamlı/geçici) görsün; 502'ye gömme.
                503 => 503,
                _ => 502,
            };
            return ApiResponse<ScannedReceiptDto>.Fail("Gemini OCR servisi hata verdi.", userStatus, errorCode: ErrorCodes.OcrServiceError);
        }
        catch (Exception ex)
        {
            _logger.LogError("Gemini fiş tarama beklenmedik hata: type={Type} message={Message}", ex.GetType().Name, ex.Message);
            _logger.LogDebug(ex, "Gemini fiş tarama exception detayı (yalnız Debug)");
            return ApiResponse<ScannedReceiptDto>.Fail("Fiş taranamadı.", 502, errorCode: ErrorCodes.ReceiptScanFailed);
        }
    }

    private readonly record struct Attempt(
        bool Success, int Status, bool Terminal, ScannedReceiptDto? Dto, string? Message, string? ErrorCode);

    private async Task<Attempt> TryOnceAsync(
        HttpClient client, string model, string mime, string base64, CancellationToken ct)
    {
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = Prompt },
                        new { inline_data = new { mime_type = mime, data = base64 } },
                    },
                },
            },
            generationConfig = new
            {
                responseMimeType = "application/json",
                responseSchema = BuildSchema(),
                temperature = 0.0,
            },
        };

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={_settings.ApiKey}";
        using var response = await client.PostAsJsonAsync(url, requestBody, ct);

        if (!response.IsSuccessStatusCode)
        {
            var status = (int)response.StatusCode;
            _logger.LogWarning("Gemini OCR denemesi başarısız: model={Model} status={Status}", model, status);
            // Yetki hatası kalıcı (aynı key) → terminal işaretle, boş yere diğer modeli deneme.
            var terminal = status is 401 or 403;
            return new Attempt(false, status, terminal, null, "Gemini OCR servisi hata verdi.", ErrorCodes.OcrServiceError);
        }

        // 200 OK — gövdeyi parse et. Beklenmedik şekil/boş içerik (ör. güvenlik bloğu)
        // "veri okunamadı" sayılır; başka model denemek kotayı boşa yakar → terminal.
        try
        {
            using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            if (string.IsNullOrWhiteSpace(text))
                return new Attempt(false, 422, true, null, "Fişten veri okunamadı.", ErrorCodes.ReceiptNoData);

            var parsed = JsonSerializer.Deserialize<GeminiReceipt>(text, JsonOpts);
            if (parsed is null)
                return new Attempt(false, 422, true, null, "Fişten veri okunamadı.", ErrorCodes.ReceiptNoData);

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
                Confidence = null, // Gemini güven skoru vermez.
                Items = parsed.Items?.Select(i => new ScannedReceiptItemDto
                {
                    Name = i.Name,
                    Quantity = i.Quantity,
                    Price = i.Price,
                    TotalPrice = i.TotalPrice,
                }).ToList() ?? new List<ScannedReceiptItemDto>(),
            };

            return new Attempt(true, 200, false, dto, null, null);
        }
        catch (Exception ex) when (ex is KeyNotFoundException or InvalidOperationException or JsonException)
        {
            _logger.LogWarning("Gemini OCR yanıtı beklenmedik şekilde: model={Model} type={Type}", model, ex.GetType().Name);
            return new Attempt(false, 422, true, null, "Fişten veri okunamadı.", ErrorCodes.ReceiptNoData);
        }
    }

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
    };

    private static string NormalizeMime(string contentType)
    {
        var ct = contentType?.Trim().ToLowerInvariant();
        return ct switch
        {
            "image/jpeg" or "image/png" or "image/webp" or "image/heic" or "image/heif" or "application/pdf" => ct,
            "image/jpg" => "image/jpeg",
            _ => "image/jpeg",
        };
    }

    private static DateTime? ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d : null;
    }

    // Gemini responseSchema (OpenAPI subset) — ScannedReceiptDto ile birebir.
    private static object BuildSchema() => new
    {
        type = "OBJECT",
        properties = new
        {
            merchantName = new { type = "STRING", nullable = true },
            merchantAddress = new { type = "STRING", nullable = true },
            merchantPhone = new { type = "STRING", nullable = true },
            transactionDate = new { type = "STRING", nullable = true },
            total = new { type = "NUMBER", nullable = true },
            subtotal = new { type = "NUMBER", nullable = true },
            tax = new { type = "NUMBER", nullable = true },
            currency = new { type = "STRING", nullable = true },
            receiptType = new { type = "STRING", nullable = true },
            items = new
            {
                type = "ARRAY",
                items = new
                {
                    type = "OBJECT",
                    properties = new
                    {
                        name = new { type = "STRING", nullable = true },
                        quantity = new { type = "NUMBER", nullable = true },
                        price = new { type = "NUMBER", nullable = true },
                        totalPrice = new { type = "NUMBER", nullable = true },
                    },
                },
            },
        },
    };

    private sealed class GeminiReceipt
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
        public List<GeminiReceiptItem>? Items { get; set; }
    }

    private sealed class GeminiReceiptItem
    {
        public string? Name { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? Price { get; set; }
        public decimal? TotalPrice { get; set; }
    }
}
