namespace ParaRota.Application.DTOs.Inflation;

/// <summary>
/// Enflasyon (TÜFE) bazlı paranın değeri hesaplama sonucu. Verilen tutarın, başlangıç
/// ayından bitiş ayına TÜFE endeksiyle ölçeklenmiş karşılığı. Endeks TP.FG.J0 (2003=100).
/// Çift yönlü çalışır: bitiş başlangıçtan önceyse çarpan &lt; 1 (geçmişin alım gücü).
/// </summary>
public class InflationConvertResultDto
{
    /// <summary>Girilen tutar.</summary>
    public decimal Amount { get; set; }

    /// <summary>İstenen başlangıç ayı (endeksin alındığı etkili ay aşağıda).</summary>
    public int FromMonth { get; set; }
    public int FromYear { get; set; }

    /// <summary>İstenen bitiş ayı.</summary>
    public int ToMonth { get; set; }
    public int ToYear { get; set; }

    /// <summary>Endeksin fiilen alındığı bitiş ayı (yayın gecikmesiyle istenenden eski olabilir).</summary>
    public int EffectiveToMonth { get; set; }
    public int EffectiveToYear { get; set; }

    /// <summary>Tutarın bitiş ayındaki eşdeğeri (Amount × bitiş/başlangıç endeksi).</summary>
    public decimal EquivalentAmount { get; set; }

    /// <summary>Dönem boyunca kümülatif enflasyon (%, 2 hane). Çarpan−1.</summary>
    public decimal InflationPercent { get; set; }

    /// <summary>Bitiş/başlangıç endeks oranı (kümülatif çarpan, 4 hane).</summary>
    public decimal CumulativeMultiplier { get; set; }

    /// <summary>Yıllık ortalama bileşik enflasyon (%, 2 hane) — dönem ≥ 12 ay (ileri yön) ise, aksi halde 0.</summary>
    public decimal AnnualizedPercent { get; set; }

    /// <summary>Bitiş ayı henüz yayınlanmadığı için en güncel ay kullanıldıysa true.</summary>
    public bool IsProvisional { get; set; }

    /// <summary>Alım gücü eğrisi: tutarın her aydaki eşdeğeri (mini grafik için, seyreltilmiş).</summary>
    public List<InflationSeriesPointDto> Series { get; set; } = [];
}

/// <summary>Alım gücü eğrisinin bir noktası — tutarın o aydaki eşdeğeri.</summary>
public class InflationSeriesPointDto
{
    public int Month { get; set; }
    public int Year { get; set; }

    /// <summary>Amount × (o ayın endeksi / başlangıç endeksi).</summary>
    public decimal Value { get; set; }
}
