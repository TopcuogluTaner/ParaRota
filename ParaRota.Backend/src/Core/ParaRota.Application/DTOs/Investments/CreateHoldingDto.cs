using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Investments;

public class CreateHoldingDto
{
    public AssetType AssetType { get; set; }

    // AssetType == TefasFund iken zorunlu: TEFAS fon kodu (ör. "AFA"). Diğer varlıklarda boş.
    public string? FundCode { get; set; }

    public DateTime PurchaseDate { get; set; }

    // İkisinden biri girilir; diğeri o günkü kurdan türetilir (çift giriş modu).
    public decimal? InvestedAmount { get; set; } // ₺ tutar
    public decimal? Quantity { get; set; }        // adet/gram

    // Alım aynı zamanda hesaptan gider olarak düşülsün mü? (Yatırım sistem kategorisi)
    public bool LinkToCashFlow { get; set; }

    public string? Note { get; set; }

    // Aile scope'u için opsiyonel — verilirse kullanıcı o household'ın aktif üyesi olmalı.
    public int? HouseholdId { get; set; }
}
