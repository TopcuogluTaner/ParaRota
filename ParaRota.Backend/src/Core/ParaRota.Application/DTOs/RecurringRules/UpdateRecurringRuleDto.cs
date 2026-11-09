using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.RecurringRules;

public class UpdateRecurringRuleDto
{
    public string Description { get; set; } = string.Empty;
    public TransactionNature Nature { get; set; }
    public int CategoryId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";
    public RecurringFrequency Frequency { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool AutoApprove { get; set; }
    public bool IsActive { get; set; }
    public string? Notes { get; set; }
    // Type değişmez (Transaction ile aynı kural).
}
