using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Transactions;

public class CreateTransactionDto
{
    public int CategoryId { get; set; }
    public TransactionType Type { get; set; }
    public TransactionNature Nature { get; set; } = TransactionNature.Variable;
    public TransactionStatus Status { get; set; } = TransactionStatus.Completed;

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";
    public PaidVia? PaidVia { get; set; }

    public DateTime TransactionDate { get; set; }
    public string? Notes { get; set; }
    public string? ReceiptUrl { get; set; }

    // Aile scope'u için opsiyonel — verilirse kullanıcı o household'ın aktif üyesi olmalı.
    public int? HouseholdId { get; set; }
}
