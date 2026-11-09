using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Debts;

public class DebtListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DebtKind Kind { get; set; }
    public string CounterpartyName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal RemainingAmount { get; set; }
    public string Currency { get; set; } = "TRY";
    public DebtStatus Status { get; set; }
    public DateTime? NextDueDate { get; set; }
    public int? HouseholdId { get; set; }
    public DateTime? DueDate { get; set; }
}
