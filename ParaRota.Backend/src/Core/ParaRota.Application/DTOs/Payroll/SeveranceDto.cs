namespace ParaRota.Application.DTOs.Payroll;

/// <summary>
/// Kıdem & ihbar tazminatı tahmini sonucu. Hesap kuralları (4857/1475 sayılı kanunlar):
/// - Kıdem: her tam yıl için 30 günlük brüt ücret (tavanla sınırlı), artan günler oransal;
///   1 yılı doldurmayan çalışana kıdem doğmaz. Kesinti yalnız damga vergisidir.
/// - İhbar: kıdeme göre 2/4/6/8 hafta × günlük brüt; gelir+damga vergisine tabidir
///   (net tutar kişinin kümülatif matrahına bağlı olduğundan burada BRÜT verilir).
/// - İzin alacağı: kullanılmamış gün × günlük brüt; vergiye tabidir (BRÜT verilir).
/// Tutarlar tahmindir; giydirilmiş ücret (yol/yemek vb. düzenli yan ödemeler) dahil edilmez.
/// </summary>
public class SeveranceResultDto
{
    public int Year { get; set; }                       // kullanılan parametre yılı

    // Kıdem süresi kırılımı
    public int ServiceYears { get; set; }
    public int ServiceMonths { get; set; }
    public int ServiceDays { get; set; }
    public int TotalServiceDays { get; set; }

    public bool EligibleForSeverance { get; set; }      // ≥ 1 tam yıl

    public decimal SeveranceCeiling { get; set; }       // dönem tavanı (aylık)
    public bool CeilingApplied { get; set; }            // brüt > tavan ise true
    public decimal CappedMonthlyGross { get; set; }     // min(brüt, tavan)

    public decimal SeveranceGross { get; set; }
    public decimal SeveranceStamp { get; set; }
    public decimal SeveranceNet { get; set; }           // brüt − damga (kıdem gelir vergisinden muaf)

    public int NoticeWeeks { get; set; }
    public decimal NoticeGross { get; set; }            // vergiye tabi — brüt

    public decimal VacationGross { get; set; }          // vergiye tabi — brüt

    public decimal TotalGross { get; set; }             // kıdem brüt + ihbar brüt + izin brüt

    // Kahraman rakam: kıdem NET (damga düşülmüş) + ihbar brüt + izin brüt.
    // İhbar/izin neti kümülatif matraha bağlı olduğundan tam net verilemez;
    // bu, "eline geçecek" vaadi için TotalGross'tan daha dürüst tahmindir.
    public decimal TotalEstimated { get; set; }
}
