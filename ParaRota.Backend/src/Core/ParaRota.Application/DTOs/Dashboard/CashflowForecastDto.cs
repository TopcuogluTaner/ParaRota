using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Dashboard;

/// <summary>
/// Nakit akışı tahmini: bu ayın gerçekleşeni + bugünden ay sonuna bilinen
/// akışlar (tekrarlayan kurallar — maaş otomatiği gerçek netiyle, taksitler
/// son-ay küsuratıyla). Borç vadeleri bilinçli olarak dahil DEĞİL (bağlı
/// kurallar zaten kapsar; çift sayım riski).
/// Para birimi: dashboard agregasyon sözleşmesiyle aynı — tutarlar para
/// birimi ayrımı yapılmadan toplanır (kalemlerde currency ayrıca döner).
/// </summary>
public class CashflowForecastDto
{
    public DateTime MonthStart { get; set; }
    public DateTime MonthEnd { get; set; }

    // Bu ay şu ana kadar gerçekleşen (Completed işlemler).
    public decimal ActualIncome { get; set; }
    public decimal ActualExpense { get; set; }
    public decimal ActualNet { get; set; }

    // Bugünden (hariç) ay sonuna planlanan tekrarlayan akışlar.
    public decimal PlannedIncome { get; set; }
    public decimal PlannedExpense { get; set; }

    // Ay sonu tahmini: ActualNet + PlannedIncome - PlannedExpense.
    public decimal ProjectedNet { get; set; }

    // Takvim için gün-gün planlanan kalemler (tarih sıralı).
    public List<CashflowItemDto> Items { get; set; } = [];
}

public class CashflowItemDto
{
    public DateTime Date { get; set; }
    public int RuleId { get; set; }
    public string Description { get; set; } = string.Empty;
    public TransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";
}
