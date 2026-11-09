using ParaRota.Application.Services.Reporting;

namespace ParaRota.Application.DTOs.Exports;

/// <summary>
/// Aylık özet PDF için istek. Scope <c>X-Active-Household-Id</c> header'ından
/// (CurrentUserService) çözülür; client ayrıca household belirtemez.
/// </summary>
public class MonthlyPdfRequest
{
    /// <summary>Raporlanacak aylar (1-12), tümü <see cref="Year"/> içinde. Birden fazla seçilebilir.</summary>
    public List<int> Months { get; set; } = [];

    /// <summary>Geriye dönük uyumluluk: tekil ay. <see cref="Months"/> boşsa fallback olarak kullanılır.</summary>
    public int? Month { get; set; }

    public int Year { get; set; }

    /// <summary>true → "En Büyük İşlemler" tablosu PDF'e dahil edilir. false → özet + kategori dağılımı kalır.</summary>
    public bool IncludeTransactions { get; set; } = true;

    /// <summary>Çok aylı seçimde düzen: tek birleşik özet (Combined) ya da ay başına bölüm (PerMonth).</summary>
    public MonthlyPdfLayout Layout { get; set; } = MonthlyPdfLayout.Combined;
}
