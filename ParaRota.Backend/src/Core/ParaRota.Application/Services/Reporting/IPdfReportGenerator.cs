namespace ParaRota.Application.Services.Reporting;

/// <summary>
/// Faz 4 — aylık özet PDF üreticisi. Implementasyon Infrastructure katmanında
/// (QuestPDF veya başka library). ExportService bu interface'e bağlıdır.
/// </summary>
public interface IPdfReportGenerator
{
    byte[] RenderMonthlySummary(MonthlyPdfModel model);
}
