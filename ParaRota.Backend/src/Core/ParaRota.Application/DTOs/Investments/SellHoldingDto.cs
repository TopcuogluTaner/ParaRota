namespace ParaRota.Application.DTOs.Investments;

public class SellHoldingDto
{
    public DateTime SaleDate { get; set; }

    // null veya 0 = pozisyonun tamamını sat. Aksi halde kısmi satış (adet/gram).
    public decimal? Quantity { get; set; }

    // Satış geliri hesaba gelir olarak yansısın mı? ("Yatırım Geliri" sistem kategorisi)
    public bool LinkToCashFlow { get; set; }
}
