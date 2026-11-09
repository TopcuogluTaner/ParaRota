using System.Text.Json.Serialization;

namespace ParaRota.Application.DTOs.Subscriptions;

/// <summary>
/// RevenueCat webhook gövdesi. RevenueCat snake_case JSON gönderir; alanlar
/// <see cref="JsonPropertyNameAttribute"/> ile eşlenir. Tüm alanlar opsiyonel —
/// gelmeyen alanlar null kalır, servis savunmacı davranır.
/// </summary>
public sealed class RevenueCatWebhookPayload
{
    [JsonPropertyName("event")]
    public RevenueCatEvent? Event { get; set; }
}

public sealed class RevenueCatEvent
{
    /// <summary>RevenueCat olay kimliği (UUID) — aynı olayın yeniden teslimini dedup etmek için.</summary>
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    /// <summary>INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, PRODUCT_CHANGE, UNCANCELLATION, SUBSCRIPTION_EXTENDED, TEST ...</summary>
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    /// <summary>Bizim kullanıcı ID'miz (string). <c>Purchases.logIn(userId)</c> ile set edilir.</summary>
    [JsonPropertyName("app_user_id")]
    public string? AppUserId { get; set; }

    [JsonPropertyName("original_app_user_id")]
    public string? OriginalAppUserId { get; set; }

    [JsonPropertyName("product_id")]
    public string? ProductId { get; set; }

    [JsonPropertyName("entitlement_ids")]
    public List<string>? EntitlementIds { get; set; }

    /// <summary>NORMAL | TRIAL | INTRO | PROMOTIONAL</summary>
    [JsonPropertyName("period_type")]
    public string? PeriodType { get; set; }

    /// <summary>APP_STORE | PLAY_STORE | STRIPE | ...</summary>
    [JsonPropertyName("store")]
    public string? Store { get; set; }

    [JsonPropertyName("expiration_at_ms")]
    public long? ExpirationAtMs { get; set; }

    [JsonPropertyName("purchased_at_ms")]
    public long? PurchasedAtMs { get; set; }

    [JsonPropertyName("event_timestamp_ms")]
    public long? EventTimestampMs { get; set; }

    [JsonPropertyName("original_transaction_id")]
    public string? OriginalTransactionId { get; set; }

    [JsonPropertyName("environment")]
    public string? Environment { get; set; }
}
