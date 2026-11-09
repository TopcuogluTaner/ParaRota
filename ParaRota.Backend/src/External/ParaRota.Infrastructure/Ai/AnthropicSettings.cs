namespace ParaRota.Infrastructure.Ai;

public class AnthropicSettings
{
    public const string SectionName = "Anthropic";

    public string ApiKey { get; set; } = string.Empty;
    // Fiş/metin gibi kısa yapısal çıkarımlar için iyi görsel + isabet/maliyet dengesi.
    // Daha ucuz: claude-haiku-4-5 · Daha zeki: claude-opus-4-8 (Anthropic:Model ile değiştir).
    public string Model { get; set; } = "claude-sonnet-4-6";
}
