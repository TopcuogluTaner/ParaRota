using ParaRota.Domain.Abstractions;

namespace ParaRota.Domain.Entities;

/// <summary>
/// Kıdem tazminatı tavanı — dönemsel (memur maaş katsayısıyla yılda iki kez, Ocak/Temmuz değişir).
/// Resmi makine-okunur kaynak yok (Hazine genelgesi PDF); bu yüzden tavan admin panelinden
/// elle güncellenir (deploy/kod değişikliği gerekmez). <see cref="EffectiveFrom"/> tarihinden
/// itibaren yürürlüktedir; hesap o tarihte yürürlükteki en güncel tavanı kullanır.
/// </summary>
public class SeveranceCeiling : BaseEntity
{
    /// <summary>Tavanın yürürlüğe girdiği tarih (ör. 2026-07-01). Aynı tarih için tek kayıt.</summary>
    public DateTime EffectiveFrom { get; set; }

    /// <summary>Aylık tavan tutarı (₺), ör. 64948.77.</summary>
    public decimal Amount { get; set; }

    /// <summary>Serbest not (ör. "2026 H2" veya genelge referansı) — yalnız admin görünür.</summary>
    public string? Note { get; set; }
}
