namespace ParaRota.Application.DTOs.Loan;

/// <summary>
/// Kredi gerçek maliyeti sonucu. Eşit taksitli (anüite) yöntem; taksit, aylık maliyet
/// oranı (faiz × (1 + KKDF + BSMV)) üzerinden hesaplanır. Konut'ta vergi istisnası (0).
/// </summary>
public class LoanCostResultDto
{
    public decimal Amount { get; set; }
    public decimal MonthlyRatePercent { get; set; }
    public int TermMonths { get; set; }
    public decimal DosyaMasrafi { get; set; }

    /// <summary>Uygulanan vergi oranları (konutta 0) — gösterim için.</summary>
    public decimal KkdfPercent { get; set; }
    public decimal BsmvPercent { get; set; }

    /// <summary>Aylık taksit.</summary>
    public decimal MonthlyPayment { get; set; }

    /// <summary>Toplam geri ödeme (anapara + faiz + vergi).</summary>
    public decimal TotalPayment { get; set; }

    /// <summary>Toplam faiz.</summary>
    public decimal TotalInterest { get; set; }

    /// <summary>Toplam KKDF + BSMV.</summary>
    public decimal TotalTax { get; set; }

    /// <summary>Toplam maliyet (faiz + vergi + dosya masrafı) = geri ödeme − anapara + masraf.</summary>
    public decimal TotalCost { get; set; }

    /// <summary>Aylık maliyet oranı (%, 2 hane) = faiz × (1 + KKDF + BSMV).</summary>
    public decimal MonthlyCostRatePercent { get; set; }

    /// <summary>Gerçek yıllık maliyet oranı (%, 2 hane) = (1 + aylık maliyet)¹² − 1. Vurucu rakam.</summary>
    public decimal AnnualCostRatePercent { get; set; }

    /// <summary>Reklamdaki yıllık akdi faiz (%, 2 hane) = aylık faiz × 12 — kıyas için.</summary>
    public decimal NominalAnnualRatePercent { get; set; }

    /// <summary>Ay ay ödeme planı.</summary>
    public List<LoanScheduleRowDto> Schedule { get; set; } = [];
}

/// <summary>Ödeme planının bir ayı.</summary>
public class LoanScheduleRowDto
{
    public int Month { get; set; }
    /// <summary>Anaparaya giden kısım.</summary>
    public decimal Principal { get; set; }
    /// <summary>Faiz kısmı.</summary>
    public decimal Interest { get; set; }
    /// <summary>KKDF + BSMV kısmı.</summary>
    public decimal Tax { get; set; }
    /// <summary>Bu ay sonrası kalan anapara.</summary>
    public decimal Balance { get; set; }
}
