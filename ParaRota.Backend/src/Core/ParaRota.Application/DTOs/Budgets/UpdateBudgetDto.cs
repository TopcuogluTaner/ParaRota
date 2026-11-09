namespace ParaRota.Application.DTOs.Budgets;

public class UpdateBudgetDto
{
    public decimal MonthlyLimit { get; set; }
    public int WarnThreshold { get; set; } = 80;
    // CategoryId, Month, Year değiştirilemez — başka ay/kategori için yeni Budget yarat.
}
