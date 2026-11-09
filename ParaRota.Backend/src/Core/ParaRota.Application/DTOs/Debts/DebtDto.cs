using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Debts;

public class DebtDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? HouseholdId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public DebtKind Kind { get; set; }

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";
    public decimal RemainingAmount { get; set; }

    // Computed: Amount - RemainingAmount
    public decimal PaidAmount { get; set; }

    public string CounterpartyName { get; set; } = string.Empty;
    public decimal? InterestRate { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime? DueDate { get; set; }

    public int? InstallmentCount { get; set; }
    public DebtFrequency? InstallmentFrequency { get; set; }

    public PaymentMode PaymentMode { get; set; }
    public int? LinkedRecurringRuleId { get; set; }

    public DebtStatus Status { get; set; }
    public DateTime? NextDueDate { get; set; }

    public int PaymentsCount { get; set; }
    public DateTime? LastPaymentDate { get; set; }

    public DateTime CreatedDate { get; set; }
}
