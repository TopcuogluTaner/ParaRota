using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Transactions;

public class UpdateTransactionDto
{
    public int CategoryId { get; set; }
    public TransactionNature Nature { get; set; }
    public TransactionStatus Status { get; set; }

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";
    public PaidVia? PaidVia { get; set; }

    public DateTime TransactionDate { get; set; }
    public string? Notes { get; set; }
    public string? ReceiptUrl { get; set; }
    // Type değiştirilemez — gelir bir gider'e dönüşmez. Kategoriyi farklı türe değiştirmek için silip yeniden yarat.

    // Aile scope'u için opsiyonel — verilirse kullanıcı o household'ın aktif üyesi olmalı.
    public int? HouseholdId { get; set; }
}
