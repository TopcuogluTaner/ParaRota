using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Debts;

public class UpdateDebtDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string CounterpartyName { get; set; } = string.Empty;
    public decimal? InterestRate { get; set; }
    public DateTime? DueDate { get; set; }

    // Yalnızca Active <-> Cancelled geçişlerine izin verilir; Completed servis tarafından set edilir.
    public DebtStatus Status { get; set; }
}
