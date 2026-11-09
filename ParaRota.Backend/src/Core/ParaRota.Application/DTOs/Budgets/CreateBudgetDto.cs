namespace ParaRota.Application.DTOs.Budgets;

public class CreateBudgetDto
{
    public int CategoryId { get; set; }
    public decimal MonthlyLimit { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public int WarnThreshold { get; set; } = 80;

    // Aile scope'u için opsiyonel — verilirse kullanıcı o household'ın aktif üyesi olmalı.
    public int? HouseholdId { get; set; }
}
