using ParaRota.Application.DTOs.Categories;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Budgets;

public class BudgetDto
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public CategoryDto Category { get; set; } = null!;

    public decimal MonthlyLimit { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public int WarnThreshold { get; set; }

    // Runtime'da Transaction'lardan hesaplanır.
    public decimal Spent { get; set; }
    public decimal Remaining { get; set; }
    public double UsagePercentage { get; set; }
    public BudgetAlertLevel AlertLevel { get; set; }

    // Aile scope'unda bu bütçeye kimin ne kadar harcadığı (kişisel scope'ta boş).
    public IReadOnlyList<BudgetMemberSpentDto> MemberBreakdown { get; set; } = Array.Empty<BudgetMemberSpentDto>();
}

public class BudgetMemberSpentDto
{
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}
