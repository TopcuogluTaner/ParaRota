namespace ParaRota.Application.DTOs.Rent;

/// <summary>
/// Kira artışı hesaplama sonucu. TBK m.344: yenileme döneminde artış, bir önceki kira
/// yılına ait TÜFE on iki aylık ortalamalara göre değişim oranını GEÇEMEZ. Oran,
/// yenileme ayından bir önceki ayın açıklanan verisinden alınır.
/// </summary>
public class RentIncreaseResultDto
{
    public decimal CurrentRent { get; set; }

    /// <summary>TÜFE 12 aylık ortalamalara göre değişim (%, 2 hane).</summary>
    public decimal RatePercent { get; set; }

    /// <summary>Yasal üst sınırla yeni kira (CurrentRent × (1 + oran)).</summary>
    public decimal MaxNewRent { get; set; }

    public decimal IncreaseAmount { get; set; }

    /// <summary>Oranın ait olduğu TÜFE ayı (etkili veri ayı).</summary>
    public int ReferenceMonth { get; set; }
    public int ReferenceYear { get; set; }

    /// <summary>
    /// İstenen referans ayın (yenileme−1) TÜFE'si henüz açıklanmadıysa true —
    /// en son açıklanan ayın oranı gösterilir, kesin oran açıklanınca değişebilir.
    /// </summary>
    public bool IsProvisional { get; set; }
}
