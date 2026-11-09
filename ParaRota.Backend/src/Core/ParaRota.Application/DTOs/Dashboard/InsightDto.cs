namespace ParaRota.Application.DTOs.Dashboard;

/// <summary>
/// Kural bazlı içgörü. Bildirim sözleşmesiyle aynı i18n modeli: backend
/// anahtar + parametre üretir, metin frontend'de kullanıcının dilinde kurulur.
/// Key: categorySpike | budgetPace | savingsRate | overspend | upcomingWeek
/// Severity: info | warning | success
/// </summary>
public class InsightDto
{
    public string Key { get; set; } = string.Empty;
    public string Severity { get; set; } = "info";
    public Dictionary<string, object?> Params { get; set; } = [];
}
