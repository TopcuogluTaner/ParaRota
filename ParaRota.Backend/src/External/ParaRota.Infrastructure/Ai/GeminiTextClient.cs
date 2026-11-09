using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ParaRota.Application.Services;
using ParaRota.Infrastructure.Ocr;

namespace ParaRota.Infrastructure.Ai;

/// <summary>
/// Gemini metin istemcisi — OCR servisindeki HTTP kalıbının (responseMimeType=json +
/// responseSchema + temperature 0) görselsiz, yeniden kullanılabilir hali.
/// Aynı GeminiSettings'i (model + key) paylaşır.
/// </summary>
public class GeminiTextClient(
    IHttpClientFactory httpClientFactory,
    IOptions<GeminiSettings> settings,
    ILogger<GeminiTextClient> logger) : IGeminiTextClient
{
    private readonly GeminiSettings _settings = settings.Value;

    public Task<GeminiTextResult> GenerateJsonAsync(string prompt, object responseSchema, CancellationToken cancellationToken = default)
        => SendAsync(new object[] { new { text = prompt } }, responseSchema, cancellationToken);

    public Task<GeminiTextResult> GenerateJsonFromAudioAsync(string prompt, byte[] audio, string mimeType, object responseSchema, CancellationToken cancellationToken = default)
        => SendAsync(
            new object[]
            {
                new { text = prompt },
                new { inline_data = new { mime_type = mimeType, data = Convert.ToBase64String(audio) } },
            },
            responseSchema,
            cancellationToken);

    private async Task<GeminiTextResult> SendAsync(object[] parts, object responseSchema, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
            return new GeminiTextResult(false, 503, null);

        try
        {
            var requestBody = new
            {
                contents = new[] { new { parts } },
                generationConfig = new
                {
                    responseMimeType = "application/json",
                    responseSchema,
                    temperature = 0.2,
                },
            };

            var client = httpClientFactory.CreateClient("ai");
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_settings.Model}:generateContent?key={_settings.ApiKey}";

            using var response = await client.PostAsJsonAsync(url, requestBody, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var status = (int)response.StatusCode;
                logger.LogError("Gemini text hatası: status={Status}", status);
                return new GeminiTextResult(false, status == 429 ? 429 : 502, null);
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return string.IsNullOrWhiteSpace(text)
                ? new GeminiTextResult(false, 422, null)
                : new GeminiTextResult(true, 200, text);
        }
        catch (Exception ex)
        {
            logger.LogError("Gemini text beklenmedik hata: type={Type} message={Message}", ex.GetType().Name, ex.Message);
            return new GeminiTextResult(false, 502, null);
        }
    }
}
