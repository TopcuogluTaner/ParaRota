using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Investments;

public class HoldingDto
{
    public int Id { get; set; }
    public AssetType AssetType { get; set; }

    // TEFAS fonunda fon kodu + adı (gösterim); diğer varlıklarda null.
    public string? FundCode { get; set; }
    public string? FundName { get; set; }

    public decimal Quantity { get; set; }
    public decimal InvestedAmount { get; set; }
    public decimal UnitPriceAtPurchase { get; set; }
    public DateTime PurchaseDate { get; set; }
    public string Currency { get; set; } = "TRY";
    public int? LinkedTransactionId { get; set; }
    public string? Note { get; set; }

    // Değerleme (hesaplanır):
    public decimal CurrentUnitPrice { get; set; }
    public decimal CurrentValue { get; set; }
    public decimal ProfitLoss { get; set; }
    public decimal ProfitLossPct { get; set; }
    public DateTime? PriceAsOf { get; set; }
}
