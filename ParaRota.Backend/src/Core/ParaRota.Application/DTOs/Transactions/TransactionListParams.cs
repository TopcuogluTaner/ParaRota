using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Transactions;

public class TransactionListParams
{
    public TransactionType? Type { get; set; }
    public TransactionNature? Nature { get; set; }
    public TransactionStatus? Status { get; set; }
    public int? CategoryId { get; set; }
    public int? Month { get; set; }
    public int? Year { get; set; }
    public string? Q { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
