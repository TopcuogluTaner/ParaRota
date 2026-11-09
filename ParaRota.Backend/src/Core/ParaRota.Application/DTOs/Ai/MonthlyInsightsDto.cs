namespace ParaRota.Application.DTOs.Ai;

/// <summary>
/// Aylık AI içgörüleri. Rakamlar SUNUCUDA hesaplanır; Gemini yalnız verilen gerçekleri
/// kullanıcı dilinde yorumlar (halüsinasyon koruması).
/// </summary>
public class MonthlyInsightsDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public List<InsightItemDto> Items { get; set; } = [];
}

public class InsightItemDto
{
    public string Text { get; set; } = string.Empty;

    /// <summary>positive | warning | neutral — istemci renk/ikon seçimi için.</summary>
    public string Tone { get; set; } = "neutral";
}
