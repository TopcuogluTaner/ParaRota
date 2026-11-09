using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.RecurringRules;

public class CreateRecurringRuleDto
{
    public string Description { get; set; } = string.Empty;
    public TransactionType Type { get; set; }
    public TransactionNature Nature { get; set; } = TransactionNature.Fixed;
    public int CategoryId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";
    public RecurringFrequency Frequency { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool AutoApprove { get; set; }
    public string? Notes { get; set; }

    // Doluysa "maaş otomatiği": her periyotta ilgili ayın resmi netini üretir. Amount yine de
    // nominal değer olarak gönderilir (validator > 0 ister) ama üretimde yok sayılır. Brüt aylık maaş.
    public decimal? PayrollGrossMonthly { get; set; }

    // Kredi kartı taksiti: doluysa kural taksit planıdır (Frequency=Monthly + Type=Expense zorunlu,
    // EndDate gönderilmez — server hesaplar). Amount = aylık taksit tutarı.
    public int? InstallmentCount { get; set; }

    // Taksitli alışverişin toplam tutarı (opsiyonel; yoksa Amount × Count kabul edilir).
    public decimal? InstallmentTotalAmount { get; set; }

    // Aile scope'u için opsiyonel — verilirse kullanıcı o household'ın aktif üyesi olmalı.
    public int? HouseholdId { get; set; }
}
