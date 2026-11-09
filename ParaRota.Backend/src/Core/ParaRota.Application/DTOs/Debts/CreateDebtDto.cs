using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Debts;

public class CreateDebtDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public DebtKind Kind { get; set; }

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";

    public string CounterpartyName { get; set; } = string.Empty;
    public decimal? InterestRate { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime? DueDate { get; set; }

    public int? InstallmentCount { get; set; }
    public DebtFrequency? InstallmentFrequency { get; set; }

    public PaymentMode PaymentMode { get; set; } = PaymentMode.Manual;

    // Aile scope'u için opsiyonel — verilirse kullanıcı o household'ın aktif üyesi olmalı.
    public int? HouseholdId { get; set; }
}
