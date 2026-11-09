namespace ParaRota.Application.DTOs.Auth;

/// <summary>Profil rozeti güncelleme isteği. null/boş = rozeti kaldır (baş harflere dön).</summary>
public class AvatarDto
{
    /// <summary>"ikonAdı|#RRGGBB" (ör. "cat|#0EA5E9") veya null.</summary>
    public string? Avatar { get; set; }
}
