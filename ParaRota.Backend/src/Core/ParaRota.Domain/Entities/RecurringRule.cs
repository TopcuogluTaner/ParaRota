using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

public class RecurringRule : BaseEntity
{
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    // null = kişisel scope, dolu = aile scope. Kaydı yalnız sahibi (UserId) düzenler.
    public int? HouseholdId { get; set; }

    public string Description { get; set; } = string.Empty;

    public TransactionType Type { get; set; }
    public TransactionNature Nature { get; set; } = TransactionNature.Fixed;

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";

    public RecurringFrequency Frequency { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime NextRunDate { get; set; }

    // true ise üretilen Transaction direkt Completed olur; false ise Planned olarak düşer ve kullanıcı onaylar.
    public bool AutoApprove { get; set; }

    public bool IsActive { get; set; } = true;

    public string? Notes { get; set; }

    // Maaş otomatiği: doluysa kural her periyotta sabit Amount yerine, ilgili ay/yılın resmi
    // kümülatif netini (IPayrollService) hesaplayıp Transaction tutarı yapar. Net yıl içinde
    // kümülatif gelir vergisiyle değiştiği için tek sabit tutar bunu taşıyamaz. GÜNCEL brüt aylık maaş.
    public decimal? PayrollGrossMonthly { get; set; }

    // Maaş geçmişi (zam senaryosu): JSON dizisi [{ "year": 2026, "month": 7, "gross": 105000 }].
    // Her ay, o ay/yıl için yürürlükteki (≤) en güncel brüt kullanılır; böylece zam sonrası aylar
    // doğru kümülatif vergi dilimine düşer. Null ise PayrollGrossMonthly sabit kabul edilir (geri uyum).
    public string? PayrollGrossHistory { get; set; }

    // Kredi kartı taksiti: doluysa kural bir taksit planıdır (aylık, gider; EndDate server
    // tarafından StartDate + Count−1 ay olarak hesaplanır). Toplam taksit sayısı.
    public int? InstallmentCount { get; set; }

    // Taksitli alışverişin toplam tutarı. Son taksit = Toplam − Aylık×(N−1); eşit bölme
    // küsuratı (10.000/3 gibi) son taksitte kapanır.
    public decimal? InstallmentTotalAmount { get; set; }

    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
