namespace ParaRota.Application.Services;

/// <summary>Gemini metin çağrısının ham sonucu. Ok=false ise Status kullanıcıya yansıtılacak koddur.</summary>
public sealed record GeminiTextResult(bool Ok, int Status, string? Json);

/// <summary>
/// Gemini'ye düşük seviyeli metin → yapısal JSON çağrısı (OCR'daki HTTP kalıbının
/// görselsiz genel hali). Impl: Infrastructure/Ai/GeminiTextClient.
/// </summary>
public interface IGeminiTextClient
{
    Task<GeminiTextResult> GenerateJsonAsync(string prompt, object responseSchema, CancellationToken cancellationToken = default);

    /// <summary>Ses ekli üretim (bas-konuş): Gemini sesi kendisi çözümler — cihazda STT gerekmez.</summary>
    Task<GeminiTextResult> GenerateJsonFromAudioAsync(string prompt, byte[] audio, string mimeType, object responseSchema, CancellationToken cancellationToken = default);
}
