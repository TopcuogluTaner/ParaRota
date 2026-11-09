using Hangfire;
using ParaRota.Application.DTOs.Subscriptions;
using ParaRota.Domain.Entities;

namespace ParaRota.Application.Services;

public interface ISubscriptionService
{
    /// <summary>Kullanıcının abonelik kaydı (varsa). Yoksa null.</summary>
    Task<UserSubscription?> GetForUserAsync(int userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sunucu tarafı premium kararı: (aktif abonelik) VEYA (uygulama denemesi sürüyor).
    /// <c>/auth/me</c> ve <c>RequirePremium</c> filtresi buradan okur.
    /// </summary>
    Task<PremiumStatusDto> GetPremiumStatusAsync(int userId, CancellationToken cancellationToken = default);

    /// <summary>RevenueCat webhook olayını UserSubscription'a upsert eder (idempotent).</summary>
    Task ApplyWebhookAsync(RevenueCatWebhookPayload payload, CancellationToken cancellationToken = default);

    /// <summary>
    /// Güvenlik ağı (Hangfire): webhook kaçarsa ExpiresAt geçmiş ama hâlâ aktif görünen
    /// abonelikleri Expired'a düşürür. Etkilenen satır sayısını döner.
    /// </summary>
    // Hangfire: aynı job'ın iki instance'ı çakışmasın (restart/uzun koşu senaryosu).
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    Task<int> ExpireOverdueAsync(CancellationToken cancellationToken = default);
}
