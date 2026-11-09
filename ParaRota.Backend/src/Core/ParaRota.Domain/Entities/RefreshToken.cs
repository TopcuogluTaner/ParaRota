using ParaRota.Domain.Abstractions;

namespace ParaRota.Domain.Entities;

public class RefreshToken : BaseEntity
{
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    public string? CreatedByIp { get; set; }
    public string? RevokedByIp { get; set; }

    public bool IsActive => RevokedAt is null && DateTime.Now < ExpiresAt;
}
