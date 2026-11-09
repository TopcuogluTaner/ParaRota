using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

public class DeviceToken : BaseEntity
{
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    // FCM / APNS / Web Push token. Unique.
    public string Token { get; set; } = string.Empty;

    public DevicePlatform Platform { get; set; }

    // Token aktif mi? Eski token devredışı bırakılırsa false yapılır (soft revoke).
    public bool IsActive { get; set; } = true;

    public DateTime LastSeenAt { get; set; }
}
