using ParaRota.Application.Services;

namespace ParaRota.Infrastructure.Ai;

/// <summary>
/// IGeminiTextClient'ın Claude implementasyonu. Metin → JSON çağrısı Claude'a gider;
/// SES çağrısı (bas-konuş) Claude'da mümkün olmadığından Gemini'ye delege edilir.
/// Anthropic anahtarı yoksa metin de Gemini'ye düşer (güvenli geçiş).
/// Not: responseSchema (Gemini OpenAPI-subset formatı) Claude'a uymaz; alanlar zaten
/// prompt içinde tarif edildiği için yok sayılır, "yalnız JSON" yönergesiyle pekiştirilir.
/// </summary>
public sealed class AnthropicTextClient(
    AnthropicClient anthropic,
    GeminiTextClient geminiFallback) : IGeminiTextClient
{
    private const string JsonOnlySystem =
        "Yanıtını YALNIZCA tek bir geçerli JSON nesnesi olarak ver. " +
        "Markdown kod çiti (```), açıklama, ön/son söz EKLEME. İstenen alan adlarını birebir kullan.";

    public async Task<GeminiTextResult> GenerateJsonAsync(
        string prompt, object responseSchema, CancellationToken cancellationToken = default)
    {
        if (!anthropic.IsConfigured)
            return await geminiFallback.GenerateJsonAsync(prompt, responseSchema, cancellationToken);

        var r = await anthropic.CreateMessageAsync(
            new object[] { new { type = "text", text = prompt } },
            JsonOnlySystem,
            maxTokens: 2048,
            cancellationToken);

        if (r.Ok)
            return new GeminiTextResult(true, 200, r.Text);

        // Claude yanıt vermediyse/hata verdiyse → Gemini'ye düş (otomatik failover).
        return await geminiFallback.GenerateJsonAsync(prompt, responseSchema, cancellationToken);
    }

    // Claude ses çözümleyemez → Gemini (sesi kendisi anlar) kullanılır.
    public Task<GeminiTextResult> GenerateJsonFromAudioAsync(
        string prompt, byte[] audio, string mimeType, object responseSchema, CancellationToken cancellationToken = default)
        => geminiFallback.GenerateJsonFromAudioAsync(prompt, audio, mimeType, responseSchema, cancellationToken);
}
