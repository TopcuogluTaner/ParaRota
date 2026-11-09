using ParaRota.Domain.Abstractions;

namespace ParaRota.Domain.Entities;

/// <summary>Gün üyesi — serbest isim (çoğu üye uygulama kullanıcısı değil). Sıra = ev sahipliği düzeni.</summary>
public class GoldDayMember : BaseEntity
{
    public int GoldDayId { get; set; }
    public GoldDay GoldDay { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    /// <summary>Ev sahipliği sırası (0..N-1).</summary>
    public int Order { get; set; }

    /// <summary>Bu üye "ben" miyim — kullanıcının kendi pozisyonunu göstermek için.</summary>
    public bool IsSelf { get; set; }
}
