namespace ParaRota.Application.DTOs.Investments;

public class PortfolioDto
{
    public decimal TotalInvested { get; set; }
    public decimal TotalCurrentValue { get; set; }
    public decimal TotalProfitLoss { get; set; }
    public decimal TotalProfitLossPct { get; set; }
    public DateTime? LastUpdated { get; set; }
    public IReadOnlyList<HoldingDto> Items { get; set; } = new List<HoldingDto>();
}
