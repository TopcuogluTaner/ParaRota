namespace ParaRota.Application.DTOs.SubscriptionCatalog;

/// <summary>
/// Kullanıcı şeridi response'u. <see cref="CategoryId"/> sistem "Abonelikler" kategorisinin
/// id'sidir — isim eşleştirme frontend'e bırakılmaz (5 dilli UI'da kırılgan olurdu).
/// </summary>
public class SubscriptionCatalogDto
{
    public int CategoryId { get; set; }
    public IReadOnlyList<SubscriptionCatalogItemDto> Items { get; set; } = [];
}
