namespace ParaRota.Application.DTOs.Investments;

public class SellResultDto
{
    public decimal Proceeds { get; set; }          // satış geliri (₺)
    public decimal RealizedProfitLoss { get; set; } // gerçekleşen kâr/zarar (₺)
    public bool FullyClosed { get; set; }           // pozisyon tamamen kapandı mı
}
