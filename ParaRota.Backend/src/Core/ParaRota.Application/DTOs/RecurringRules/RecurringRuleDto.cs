using ParaRota.Application.DTOs.Categories;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.RecurringRules;

public class RecurringRuleDto
{
    public int Id { get; set; }
    public string Description { get; set; } = string.Empty;

    public TransactionType Type { get; set; }
    public TransactionNature Nature { get; set; }

    public int CategoryId { get; set; }
    public CategoryDto Category { get; set; } = null!;

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";

    public RecurringFrequency Frequency { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime NextRunDate { get; set; }

    public bool AutoApprove { get; set; }
    public bool IsActive { get; set; }

    public string? Notes { get; set; }

    // Doluysa bu kural bir "maaş otomatiği"dir: tutar her ay resmi netten hesaplanır.
    public decimal? PayrollGrossMonthly { get; set; }

    // Kredi kartı taksiti: doluysa kural bir taksit planıdır.
    public int? InstallmentCount { get; set; }
    public decimal? InstallmentTotalAmount { get; set; }

    // Şimdiye kadar üretilen taksit/işlem sayısı (mapping sonrası servis doldurur).
    public int PaidInstallments { get; set; }
}
