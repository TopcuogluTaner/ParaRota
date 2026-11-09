namespace ParaRota.Application.DTOs.Debts;

public class DebtPaymentDto
{
    public int Id { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public string? Notes { get; set; }
    public int? TransactionId { get; set; }
    public DateTime CreatedDate { get; set; }
}
