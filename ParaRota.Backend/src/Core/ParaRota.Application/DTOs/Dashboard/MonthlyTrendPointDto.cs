namespace ParaRota.Application.DTOs.Dashboard;

public class MonthlyTrendPointDto
{
    // İ18n anahtarı (örn. 'month_short_oct'). Frontend dile göre çevirir.
    public string MonthKey { get; set; } = string.Empty;
    public decimal Income { get; set; }
    public decimal Expense { get; set; }
}
