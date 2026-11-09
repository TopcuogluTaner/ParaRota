namespace ParaRota.Domain.Enums;

/// <summary>
/// Aboneliğin satın alındığı ödeme rayı. RevenueCat webhook <c>store</c> alanından eşlenir.
/// </summary>
public enum SubscriptionStore
{
    Unknown = 0,
    AppStore = 1,   // Apple IAP (StoreKit)
    PlayStore = 2,  // Google Play Billing
    Stripe = 3,     // RevenueCat Web Billing (Stripe)
}
