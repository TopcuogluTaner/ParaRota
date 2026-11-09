using ParaRota.Application.DTOs.Categories;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Transactions;

public class TransactionDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? CreatedByName { get; set; }
    public int CategoryId { get; set; }
    public CategoryDto Category { get; set; } = null!;

    public TransactionType Type { get; set; }
    public TransactionNature Nature { get; set; }
    public TransactionStatus Status { get; set; }
    public TransactionSource Source { get; set; }

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";
    public PaidVia? PaidVia { get; set; }

    public DateTime TransactionDate { get; set; }
    public string? Notes { get; set; }
    public string? ReceiptUrl { get; set; }

    public int? RecurringRuleId { get; set; }
}
