namespace ParaRota.Application.DTOs.Subscriptions;

/// <summary>
/// Sunucu tarafı premium kararı — gerçeğin kaydı. Hem <c>/auth/me</c> hem
/// <c>RequirePremium</c> filtresi bu sonucu kullanır.
/// </summary>
public sealed record PremiumStatusDto(
    bool IsPremium,
    bool IsInTrial,
    DateTime? PremiumExpiresAt,
    DateTime? TrialEndsAt,
    string? Plan);
