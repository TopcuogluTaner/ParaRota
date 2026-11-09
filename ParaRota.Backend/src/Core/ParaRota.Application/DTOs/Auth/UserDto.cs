namespace ParaRota.Application.DTOs.Auth;

public class UserDto
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public bool IsEmailVerified { get; set; }
    public int OnboardingSeenVersion { get; set; }
    public int WebOnboardingSeenVersion { get; set; }

    /// <summary>Profil rozeti: "ikonAdı|#RRGGBB" (ör. "cat|#0EA5E9"); null = seçilmemiş.</summary>
    public string? Avatar { get; set; }

    /// <summary>Opt-in: ay başında geçen ayın özet PDF'i e-postayla gönderilsin mi.</summary>
    public bool SendMonthlyPdfEmail { get; set; }

    public IReadOnlyList<string> Roles { get; set; } = Array.Empty<string>();

    // ── Premium / abonelik (sunucu = yetkili kaynak) ──────────────────────────
    /// <summary>Premium erişimi açık mı: (aktif abonelik) VEYA (uygulama denemesi sürüyor).</summary>
    public bool IsPremium { get; set; }

    /// <summary>30 günlük uygulama denemesi şu an sürüyor mu (abonelik olmadan).</summary>
    public bool IsInTrial { get; set; }

    /// <summary>Premium erişimin bitiş zamanı (aktif abonelik → ExpiresAt; sadece deneme → TrialEndsAt).</summary>
    public DateTime? PremiumExpiresAt { get; set; }

    /// <summary>Uygulama denemesinin bitiş zamanı (her kullanıcıda dolu olabilir).</summary>
    public DateTime? TrialEndsAt { get; set; }

    /// <summary>Aktif plan: <c>monthly</c> | <c>yearly</c> | <c>trial</c> | null.</summary>
    public string? Plan { get; set; }
}
