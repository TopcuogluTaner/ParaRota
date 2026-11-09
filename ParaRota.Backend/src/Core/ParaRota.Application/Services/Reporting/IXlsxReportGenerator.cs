namespace ParaRota.Application.Services.Reporting;

/// <summary>
/// Faz 4 — işlem listesi Excel üreticisi. Implementasyon Infrastructure
/// katmanında (ClosedXML). ExportService bu interface'e bağlıdır.
/// </summary>
public interface IXlsxReportGenerator
{
    byte[] RenderTransactions(IReadOnlyList<TransactionRow> rows);
}
