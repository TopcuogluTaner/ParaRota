using Azure;
using Azure.AI.DocumentIntelligence;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ParaRota.Application.DTOs.Receipts;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;

namespace ParaRota.Infrastructure.Ocr;

public class AzureReceiptOcrService : IReceiptOcrService
{
    private readonly DocumentIntelligenceClient? _client;
    private readonly ILogger<AzureReceiptOcrService> _logger;
    private const string ModelId = "prebuilt-receipt";

    public AzureReceiptOcrService(
        IOptions<AzureDocumentIntelligenceSettings> settings,
        ILogger<AzureReceiptOcrService> logger)
    {
        _logger = logger;
        var s = settings.Value;
        // Yapılandırılmamışsa fırlatma — fallback zincirinde Azure atlanıp Gemini'ye düşülebilsin.
        if (!string.IsNullOrWhiteSpace(s.Endpoint) && !string.IsNullOrWhiteSpace(s.ApiKey))
            _client = new DocumentIntelligenceClient(new Uri(s.Endpoint), new AzureKeyCredential(s.ApiKey));
    }

    public async Task<ApiResponse<ScannedReceiptDto>> ScanAsync(Stream imageStream, string contentType, CancellationToken cancellationToken = default)
    {
        if (_client is null)
            return ApiResponse<ScannedReceiptDto>.Fail("Azure OCR yapılandırılmamış.", 503, errorCode: ErrorCodes.OcrNotConfigured);

        try
        {
            using var ms = new MemoryStream();
            await imageStream.CopyToAsync(ms, cancellationToken);
            ms.Position = 0;

            var binary = BinaryData.FromBytes(ms.ToArray());
            var operation = await _client.AnalyzeDocumentAsync(
                WaitUntil.Completed,
                ModelId,
                binary,
                cancellationToken: cancellationToken);

            var result = operation.Value;
            if (result.Documents.Count == 0)
                return ApiResponse<ScannedReceiptDto>.Fail("Fişten veri okunamadı.", 422, errorCode: ErrorCodes.ReceiptNoData);

            var doc = result.Documents[0];
            var dto = new ScannedReceiptDto
            {
                Confidence = doc.Confidence,
                MerchantName = GetString(doc.Fields, "MerchantName"),
                MerchantAddress = GetString(doc.Fields, "MerchantAddress"),
                MerchantPhone = GetString(doc.Fields, "MerchantPhoneNumber"),
                TransactionDate = GetDate(doc.Fields, "TransactionDate"),
                Total = GetDecimal(doc.Fields, "Total"),
                Subtotal = GetDecimal(doc.Fields, "Subtotal"),
                Tax = GetDecimal(doc.Fields, "TotalTax"),
                Currency = GetCurrency(doc.Fields, "Total") ?? GetCurrency(doc.Fields, "Subtotal"),
                ReceiptType = GetString(doc.Fields, "ReceiptType"),
                Items = GetItems(doc.Fields, "Items"),
            };

            return ApiResponse<ScannedReceiptDto>.Success(dto, "Fiş tarandı.");
        }
        catch (RequestFailedException ex)
        {
            // API key Authorization header'da, exception'a doğrudan sızmaz; yine de ex'i değil sadece structured field'ları logluyoruz.
            _logger.LogError("Azure DI hatası: status={Status} code={Code} type={Type}", ex.Status, ex.ErrorCode ?? "<none>", ex.GetType().Name);
            _logger.LogDebug(ex, "Azure DI exception detayı (yalnız Debug)");

            // Status code'a göre kullanıcıya gerçek nedenle anlamlı mesaj.
            var (httpStatus, userMessage) = ex.Status switch
            {
                401 or 403 => (502, "OCR servisi yetkilendirme hatası (yönetici incelemeli)."),
                429        => (429, "OCR servisi şu an yoğun, kısa süre sonra tekrar deneyin."),
                413        => (413, "Fiş dosyası OCR servisi için çok büyük."),
                400        => (422, "Fiş okunamadı; format/içerik desteklenmiyor olabilir."),
                _          => (502, $"OCR servisi hata verdi: {ex.ErrorCode ?? ex.Status.ToString()}"),
            };
            return ApiResponse<ScannedReceiptDto>.Fail(userMessage, httpStatus, errorCode: ErrorCodes.OcrServiceError);
        }
        catch (Exception ex)
        {
            _logger.LogError("Fiş tarama beklenmedik hata: type={Type} message={Message}", ex.GetType().Name, ex.Message);
            _logger.LogDebug(ex, "Fiş tarama exception detayı (yalnız Debug)");
            return ApiResponse<ScannedReceiptDto>.Fail("Fiş taranamadı.", 500, errorCode: ErrorCodes.ReceiptScanFailed);
        }
    }

    private static string? GetString(IReadOnlyDictionary<string, DocumentField> fields, string key)
    {
        if (!fields.TryGetValue(key, out var f) || f is null) return null;
        if (!string.IsNullOrWhiteSpace(f.ValueString)) return f.ValueString;
        if (!string.IsNullOrWhiteSpace(f.ValuePhoneNumber)) return f.ValuePhoneNumber;
        return string.IsNullOrWhiteSpace(f.Content) ? null : f.Content;
    }

    private static decimal? GetDecimal(IReadOnlyDictionary<string, DocumentField> fields, string key)
    {
        if (!fields.TryGetValue(key, out var f) || f is null) return null;
        // Currency.Amount nullable double — defansif pattern matching ile NRE'yi engelle.
        if (f.ValueCurrency is { Amount: double amt }) return (decimal)amt;
        if (f.ValueDouble is double d) return (decimal)d;
        if (f.ValueInt64 is long i) return i;
        return null;
    }

    private static string? GetCurrency(IReadOnlyDictionary<string, DocumentField> fields, string key)
    {
        if (!fields.TryGetValue(key, out var f) || f is null) return null;
        return f.ValueCurrency?.CurrencyCode;
    }

    private static DateTime? GetDate(IReadOnlyDictionary<string, DocumentField> fields, string key)
    {
        if (!fields.TryGetValue(key, out var f) || f is null) return null;
        return f.ValueDate?.DateTime;
    }

    private static List<ScannedReceiptItemDto> GetItems(IReadOnlyDictionary<string, DocumentField> fields, string key)
    {
        var list = new List<ScannedReceiptItemDto>();
        if (!fields.TryGetValue(key, out var f) || f is null) return list;
        if (f.ValueList is null) return list;
        foreach (var item in f.ValueList)
        {
            if (item.ValueDictionary is null) continue;
            var sub = item.ValueDictionary;
            list.Add(new ScannedReceiptItemDto
            {
                Name = GetString(sub, "Description") ?? GetString(sub, "Name"),
                Quantity = GetDecimal(sub, "Quantity"),
                Price = GetDecimal(sub, "Price"),
                TotalPrice = GetDecimal(sub, "TotalPrice"),
            });
        }
        return list;
    }
}
