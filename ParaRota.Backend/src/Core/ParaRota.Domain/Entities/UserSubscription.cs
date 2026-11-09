using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

/// <summary>
/// Premium aboneliğin gerçeğin kaydı (source of truth). Kullanıcı başına TEK satır (upsert).
/// RevenueCat webhook'u ile güncellenir; <c>/auth/me</c> premium kararını buradan + deneme
/// (<see cref="AppUser.TrialEndsAt"/>) bilgisinden hesaplar. İstemci SDK anlık UX için
/// kullanılır ama gate kararı SUNUCUDADIR.
/// </summary>
public class UserSubscription : BaseEntity
{
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.None;
    public SubscriptionStore Store { get; set; } = SubscriptionStore.Unknown;

    /// <summary>Store ürün kimliği (ör. <c>pararota_premium_monthly</c>).</summary>
    public string? ProductId { get; set; }

    /// <summary>RevenueCat entitlement kimliği — her zaman <c>premium</c>.</summary>
    public string EntitlementId { get; set; } = "premium";

    /// <summary>RevenueCat period_type (normal / trial / intro / promotional).</summary>
    public string? PeriodType { get; set; }

    /// <summary>Aboneliğin/denemenin bitiş zamanı. Null = süresiz değil, bilinmiyor.</summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>Dönem sonunda otomatik yenilenecek mi (iptal edilmediyse true).</summary>
    public bool WillRenew { get; set; }

    /// <summary>RevenueCat App User ID = bizim kullanıcı ID'miz (string).</summary>
    public string? RcAppUserId { get; set; }

    /// <summary>Apple original_transaction_id / Play / Stripe — sil-yükle eşlemesi için.</summary>
    public string? OriginalTransactionId { get; set; }

    /// <summary>İşlenen son webhook olayının zamanı (eski olayları atlamak için).</summary>
    public DateTime? LastEventAt { get; set; }

    /// <summary>Son işlenen RevenueCat olayının kimliği — aynı olayın yeniden teslimi (retry) atlanır.</summary>
    public string? LastEventId { get; set; }
}
