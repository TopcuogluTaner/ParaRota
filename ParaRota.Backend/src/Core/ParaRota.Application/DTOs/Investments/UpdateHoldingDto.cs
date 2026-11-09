namespace ParaRota.Application.DTOs.Investments;

public class UpdateHoldingDto
{
    public DateTime PurchaseDate { get; set; }

    // Çift giriş: biri girilir, diğeri alış günü kurundan yeniden türetilir.
    public decimal? InvestedAmount { get; set; }
    public decimal? Quantity { get; set; }

    public string? Note { get; set; }
}
