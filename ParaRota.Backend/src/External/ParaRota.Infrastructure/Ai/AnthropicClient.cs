using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ParaRota.Infrastructure.Ai;

/// <summary>
/// Claude (Anthropic) Messages API düşük seviye istemcisi — Gemini HTTP kalıbının
/// (ham HttpClient + JSON) muadili. Tek uç: POST /v1/messages. Metin ve görsel
/// (vision) içerik blokları kabul eder; yanıttaki ilk text bloğunu döndürür.
/// Ses DESTEKLENMEZ (Claude'da konuşma-tanıma yok) — ses akışları Gemini'de kalır.
/// </summary>
public sealed class AnthropicClient(
    IHttpClientFactory httpClientFactory,
    IOptions<AnthropicSettings> settings,
    ILogger<AnthropicClient> logger)
{
    private readonly AnthropicSettings _settings = settings.Value;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString,
    };

    /// <summary>Anthropic anahtarı yapılandırılmış mı? Değilse çağıran Gemini'ye düşer.</summary>
    public bool IsConfigured => !string.IsNullOrWhiteSpace(_settings.ApiKey);

    public string Model => _settings.Model;

    /// <summary>Claude metin/görsel sonucu. Ok=false ise Status kullanıcıya yansıtılacak koddur.</summary>
    public sealed record Result(bool Ok, int Status, string? Text);

    /// <param name="userContent">user mesajının content blokları (text/image/document).</param>
    /// <param name="system">Sistem yönergesi (ör. "yalnız JSON döndür"). Boşsa gönderilmez.</param>
    public async Task<Result> CreateMessageAsync(
        object[] userContent, string? system, int maxTokens, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            return new Result(false, 503, null);

        try
        {
            object requestBody = string.IsNullOrWhiteSpace(system)
                ? new
                {
                    model = _settings.Model,
                    max_tokens = maxTokens,
                    messages = new[] { new { role = "user", content = userContent } },
                }
                : new
                {
                    model = _settings.Model,
                    max_tokens = maxTokens,
                    system,
                    messages = new[] { new { role = "user", content = userContent } },
                };

            var client = httpClientFactory.CreateClient("ai");
            client.DefaultRequestHeaders.Add("x-api-key", _settings.ApiKey);
            client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

            using var response = await client.PostAsJsonAsync(
                "https://api.anthropic.com/v1/messages", requestBody, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var status = (int)response.StatusCode;
                logger.LogError("Claude API hatası: status={Status}", status);
                var userStatus = status switch
                {
                    429 => 429,        // rate limit
                    529 => 503,        // overloaded → "yoğun, tekrar dene"
                    401 or 403 => 502, // yetki (yönetici incelemeli)
                    _ => 502,
                };
                return new Result(false, userStatus, null);
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

            // content: [{type:"text", text:"..."}, ...] — ilk text bloğunu al.
            var text = ExtractText(doc.RootElement);
            return string.IsNullOrWhiteSpace(text)
                ? new Result(false, 422, null)
                : new Result(true, 200, StripJsonFences(text));
        }
        catch (Exception ex)
        {
            logger.LogError("Claude beklenmedik hata: type={Type} message={Message}", ex.GetType().Name, ex.Message);
            return new Result(false, 502, null);
        }
    }

    private static string? ExtractText(JsonElement root)
    {
        if (!root.TryGetProperty("content", out var content) || content.ValueKind != JsonValueKind.Array)
            return null;
        foreach (var block in content.EnumerateArray())
        {
            if (block.TryGetProperty("type", out var t) && t.GetString() == "text"
                && block.TryGetProperty("text", out var txt))
                return txt.GetString();
        }
        return null;
    }

    /// <summary>Model bazen JSON'u ```json ... ``` çitiyle sarabiliyor — çıplak JSON'a indir.</summary>
    private static string StripJsonFences(string text)
    {
        var s = text.Trim();
        if (!s.StartsWith('`')) return s;
        s = s.Trim('`').Trim();
        if (s.StartsWith("json", StringComparison.OrdinalIgnoreCase))
            s = s[4..].TrimStart();
        return s.Trim();
    }
}
