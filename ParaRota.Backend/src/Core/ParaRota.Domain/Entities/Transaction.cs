using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

public class Transaction : BaseEntity
{
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    // null = kişisel scope, dolu = aile scope. Kaydı yalnız sahibi (UserId) düzenler.
    public int? HouseholdId { get; set; }

    public TransactionType Type { get; set; }
    public TransactionNature Nature { get; set; }
    public TransactionStatus Status { get; set; }
    public TransactionSource Source { get; set; } = TransactionSource.Manual;

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";

    // Nakit / Banka Kartı / Kredi Kartı / Havale / EFT — opsiyonel.
    public PaidVia? PaidVia { get; set; }

    public DateTime TransactionDate { get; set; }

    public string? Notes { get; set; }
    public string? ReceiptUrl { get; set; }

    // RecurringRule tarafından üretildiyse referans verilir; manuel girilen kayıtlarda null.
    public int? RecurringRuleId { get; set; }
    public RecurringRule? RecurringRule { get; set; }
}
