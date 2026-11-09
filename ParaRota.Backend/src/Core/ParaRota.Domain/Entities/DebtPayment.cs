using ParaRota.Domain.Abstractions;

namespace ParaRota.Domain.Entities;

public class DebtPayment : BaseEntity
{
    public int DebtId { get; set; }
    public Debt Debt { get; set; } = null!;

    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }

    public string? Notes { get; set; }

    // Eğer bu ödeme bir Transaction'a bağlandıysa (Payable→Expense / Receivable→Income); aksi halde null.
    public int? TransactionId { get; set; }
    public Transaction? Transaction { get; set; }
}
