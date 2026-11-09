using ParaRota.Application.DTOs.Budgets;
using ParaRota.Application.DTOs.Transactions;

namespace ParaRota.Application.DTOs.Dashboard;

public class DashboardSummaryDto
{
    public int Month { get; set; }
    public int Year { get; set; }

    // Seçilen ayın tamamlanmış hareketlerinden hesaplanır.
    public decimal Income { get; set; }
    public decimal Expense { get; set; }
    public decimal Net { get; set; }
    public double SavingsRate { get; set; } // 0..1

    // Son 6 ayın trend'i (sıralı: en eski → en yeni)
    public IReadOnlyList<MonthlyTrendPointDto> MonthlyTrend { get; set; } = Array.Empty<MonthlyTrendPointDto>();

    // Seçilen ayın gider kategori dağılımı (top 10, amount desc)
    public IReadOnlyList<CategoryShareDto> TopExpensesByCategory { get; set; } = Array.Empty<CategoryShareDto>();

    // Yaklaşan planlı giderler (önümüzdeki 30 gün, ilk 5)
    public IReadOnlyList<TransactionDto> UpcomingPayments { get; set; } = Array.Empty<TransactionDto>();

    // Son 7 tamamlanmış hareket
    public IReadOnlyList<TransactionDto> RecentTransactions { get; set; } = Array.Empty<TransactionDto>();

    // Seçilen ayın tüm bütçeleri — AlertLevel desc + UsagePercentage desc sıralı (Exceeded → Warning → Normal).
    public IReadOnlyList<BudgetDto> BudgetStatuses { get; set; } = Array.Empty<BudgetDto>();
}
