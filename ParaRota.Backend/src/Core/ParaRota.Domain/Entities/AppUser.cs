using Microsoft.AspNetCore.Identity;
using ParaRota.Domain.Abstractions;

namespace ParaRota.Domain.Entities;

public class AppUser : IdentityUser<int>, ISoftDeletable, IAuditable
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;

    public string? EmailVerificationCode { get; set; }
    public DateTime? EmailVerificationCodeExpiration { get; set; }
    /// <summary>E-posta doğrulama kodu için hatalı deneme sayısı. Eşik aşılınca kod iptal edilir (brute-force koruması). Yeni kod üretiminde 0'lanır.</summary>
    public int EmailVerificationCodeAttempts { get; set; }

    public string? PasswordResetCode { get; set; }
    public DateTime? PasswordResetCodeExpiration { get; set; }
    /// <summary>Parola sıfırlama kodu için hatalı deneme sayısı. Eşik aşılınca kod iptal edilir (brute-force koruması). Yeni kod üretiminde 0'lanır.</summary>
    public int PasswordResetCodeAttempts { get; set; }

    public DateTime? LastLoginAt { get; set; }

    /// <summary>
    /// Uygulama-yönetimli 30 günlük premium deneme bitişi. Bu tarihe kadar TÜM özellikler açıktır.
    /// Yeni kayıt = createdDate + 30g; mevcut kullanıcı = max(createdDate, paywallLaunchDate) + 30g (backfill).
    /// Premium = (aktif abonelik) VEYA (TrialEndsAt > DateTime.Now).
    /// </summary>
    public DateTime? TrialEndsAt { get; set; }

    /// <summary>
    /// Kullanıcının gördüğü en yüksek mobil onboarding (tanıtım turu) sürümü.
    /// 0 = hiç görmedi. İstemci `CURRENT_ONBOARDING_VERSION` ile karşılaştırır;
    /// daha büyük versiyonlu yeni tur çıkınca herkese bir kez daha gösterilebilir.
    /// </summary>
    public int OnboardingSeenVersion { get; set; }

    /// <summary>
    /// Kullanıcının gördüğü en yüksek web onboarding (tanıtım turu) sürümü.
    /// Mobil turdan ayrı tutulur — web arayüzü farklı olduğundan mobilde turu
    /// görmüş kullanıcı web'e ilk girişte web turunu yine görür. 0 = hiç görmedi.
    /// </summary>
    public int WebOnboardingSeenVersion { get; set; }

    /// <summary>
    /// Profil rozeti: "ikonAdı|#RRGGBB" (ör. "cat|#0EA5E9"). Görsel YOK — galeriden
    /// yükleme yerine küratörlü ikon+renk seti; DB'de yalnız bu küçük metin tutulur.
    /// null = rozet seçilmemiş (istemci baş harfleri gösterir).
    /// </summary>
    public string? Avatar { get; set; }

    /// <summary>
    /// Opt-in: her ayın başında geçen ayın özet PDF'i e-postayla gönderilsin mi.
    /// Varsayılan false — kullanıcı Ayarlar'dan açar (Hangfire monthly-pdf-email job'ı okur).
    /// </summary>
    public bool SendMonthlyPdfEmail { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public DateTime CreatedDate { get; set; }
    public DateTime? EditDate { get; set; }
    public string? CreatedUser { get; set; }
    public string? EditUser { get; set; }
    public bool IsDeleted { get; set; }
}
