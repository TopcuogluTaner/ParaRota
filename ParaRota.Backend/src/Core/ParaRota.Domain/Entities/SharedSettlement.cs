using ParaRota.Domain.Abstractions;

namespace ParaRota.Domain.Entities;

/// <summary>Bir üyeden diğerine yapılan ödeme kaydı ("ödendi"). Netleştirmeyi günceller.</summary>
public class SharedSettlement : BaseEntity
{
    public int SharedPotId { get; set; }
    public SharedPot SharedPot { get; set; } = null!;

    // Kaydeden (creator). Düzenleme/silmeyi yalnız bu kullanıcı yapar.
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    /// <summary>Borçlu (ödemeyi yapan üye).</summary>
    public int FromMemberId { get; set; }
    public SharedPotMember FromMember { get; set; } = null!;

    /// <summary>Alacaklı (ödemeyi alan üye).</summary>
    public int ToMemberId { get; set; }
    public SharedPotMember ToMember { get; set; } = null!;

    public decimal Amount { get; set; }
    public DateTime SettledOn { get; set; }
    public string? Note { get; set; }
}
