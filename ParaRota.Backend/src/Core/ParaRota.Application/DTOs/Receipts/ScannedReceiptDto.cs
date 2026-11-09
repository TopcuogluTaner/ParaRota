namespace ParaRota.Application.DTOs.Receipts;

public class ScannedReceiptDto
{
    public string? MerchantName { get; set; }
    public string? MerchantAddress { get; set; }
    public string? MerchantPhone { get; set; }
    public DateTime? TransactionDate { get; set; }
    public decimal? Total { get; set; }
    public decimal? Subtotal { get; set; }
    public decimal? Tax { get; set; }
    public string? Currency { get; set; }
    public string? ReceiptType { get; set; }
    /// <summary>Azure DI'nın güven skoru (0..1). Frontend bazlı uyarı için.</summary>
    public double? Confidence { get; set; }
    public List<ScannedReceiptItemDto> Items { get; set; } = new();
}

public class ScannedReceiptItemDto
{
    public string? Name { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? Price { get; set; }
    public decimal? TotalPrice { get; set; }
}
