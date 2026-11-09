using ParaRota.Domain.Abstractions;

namespace ParaRota.Domain.Entities;

/// <summary>
/// Ortak kasa üyesi. Gerçek uygulama kullanıcısı (LinkedUserId dolu → bildirim alır, "ben"
/// eşlemesi yapılır) ya da serbest isim (LinkedUserId null → defterde yer alır ama bildirim almaz).
/// </summary>
public class SharedPotMember : BaseEntity
{
    public int SharedPotId { get; set; }
    public SharedPot SharedPot { get; set; } = null!;

    /// <summary>Görünen ad. Bağlı kullanıcıda ad/soyad kopyası, serbest üyede elle girilen isim.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gerçek AppUser ise dolu; serbest isimde null.</summary>
    public int? LinkedUserId { get; set; }
    public AppUser? LinkedUser { get; set; }
}
