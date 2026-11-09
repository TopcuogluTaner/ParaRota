using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

// Bir varlık alımı (gram altın / döviz). Alış günündeki birim fiyat saklanır;
// güncel değer = Quantity × güncel fiyat, K/Z = güncel − InvestedAmount.
public class InvestmentHolding : BaseEntity
{
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    // null = kişisel scope, dolu = aile scope. Kaydı yalnız sahibi (UserId) düzenler.
    public int? HouseholdId { get; set; }

    public AssetType AssetType { get; set; }

    // TEFAS fonu ise fon kodu (ör. "AFA") + o anki fon adı (gösterim için). Diğer
    // varlıklarda null. AssetType == TefasFund iken FundCode zorunlu.
    public string? FundCode { get; set; }
    public string? FundName { get; set; }

    // Adet/gram (gram altında gram, dövizde birim adedi).
    public decimal Quantity { get; set; }

    // Alış maliyeti (₺).
    public decimal InvestedAmount { get; set; }

    // Alış günündeki birim fiyat (market/snapshot'tan). Quantity × bu ≈ InvestedAmount.
    public decimal UnitPriceAtPurchase { get; set; }

    public string Currency { get; set; } = "TRY";

    public DateTime PurchaseDate { get; set; }

    // Nakit gider bağlantısı (opsiyonel) — alım hesaptan gider olarak düşüldüyse.
    public int? LinkedTransactionId { get; set; }
    public Transaction? LinkedTransaction { get; set; }

    public string? Note { get; set; }
}
