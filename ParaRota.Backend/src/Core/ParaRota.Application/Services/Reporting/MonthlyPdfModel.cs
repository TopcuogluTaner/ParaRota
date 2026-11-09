namespace ParaRota.Application.Services.Reporting;

/// <summary>
/// Aylık özet PDF üreticisinin veri modeli. ExportService DB'den toplar,
/// IPdfReportGenerator implementasyonuna geçer.
///
/// <para>
/// Çok aylı seçim destekli: <see cref="Sections"/> ya tek birleşik bölüm
/// (Combined) ya da ay başına bir bölüm (PerMonth) taşır.
/// </para>
/// </summary>
public sealed record MonthlyPdfModel(
    string OwnerDisplayName,
    int Year,
    string Currency,
    MonthlyPdfLayout Layout,
    bool IncludeTransactions,
    IReadOnlyList<MonthlyPdfSection> Sections);

/// <summary>Tek bir rapor bölümü. Combined'da tüm seçili ayları, PerMonth'ta tek ayı kapsar.</summary>
public sealed record MonthlyPdfSection(
    IReadOnlyList<int> Months,
    decimal TotalIncome,
    decimal TotalExpense,
    decimal Net,
    IReadOnlyList<CategoryBreakdown> CategoryBreakdowns,
    IReadOnlyList<TopTransaction> TopTransactions);

/// <summary>Çok aylı PDF düzeni.</summary>
public enum MonthlyPdfLayout
{
    /// <summary>Seçili tüm aylar tek özette birleştirilir.</summary>
    Combined = 0,

    /// <summary>Her ay kendi başlığı + özetiyle ayrı bölüm olur.</summary>
    PerMonth = 1,
}

public sealed record CategoryBreakdown(string CategoryName, string Color, decimal Total, double PercentOfExpense);

public sealed record TopTransaction(DateTime Date, string Category, decimal Amount, bool IsIncome, string? Notes);
