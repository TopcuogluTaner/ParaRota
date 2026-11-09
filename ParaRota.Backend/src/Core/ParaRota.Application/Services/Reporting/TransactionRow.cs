namespace ParaRota.Application.Services.Reporting;

/// <summary>
/// İşlem listesi Excel'ine yazılacak tek satır. ExportService DB Transaction
/// entity'sinden projeksiyon yapar, IXlsxReportGenerator implementasyonuna geçer.
/// </summary>
public sealed record TransactionRow(
    DateTime Date,
    string Type,           // "Gelir" | "Gider"
    string Category,
    decimal Amount,
    string Currency,
    string? Notes,
    string Source,         // "Manual" | "Recurring" | "Ocr"
    string? CreatedByName);
