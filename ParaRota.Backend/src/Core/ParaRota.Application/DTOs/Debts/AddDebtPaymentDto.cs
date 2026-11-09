namespace ParaRota.Application.DTOs.Debts;

public class AddDebtPaymentDto
{
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public string? Notes { get; set; }

    // true (default): Payable için Expense, Receivable için Income Transaction yaratılır
    // ve DebtPayment.TransactionId set edilir.
    public bool CreateLinkedTransaction { get; set; } = true;
}
