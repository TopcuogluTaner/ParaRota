namespace ParaRota.Domain.Enums;

/// <summary>
/// Kullanıcının premium abonelik durumu (RevenueCat entitlement'ından türetilir).
/// Premium erişimi <c>Active</c> veya <c>InTrial</c> veya <c>GracePeriod</c> iken açıktır.
/// Uygulama-yönetimli 30 günlük deneme bu enum'dan AYRIDIR (bkz. <c>AppUser.TrialEndsAt</c>).
/// </summary>
public enum SubscriptionStatus
{
    None = 0,
    Active = 1,
    InTrial = 2,
    GracePeriod = 3,
    Expired = 4,
    Cancelled = 5,
}
