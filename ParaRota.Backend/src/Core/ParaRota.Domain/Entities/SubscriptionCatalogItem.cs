using ParaRota.Domain.Abstractions;

namespace ParaRota.Domain.Entities;

/// <summary>
/// "Popüler abonelikler" kataloğu — Tekrarlayanlar ekranındaki hızlı ekleme şeridinin kaynağı.
/// Bu servislerin fiyatlarını veren resmi bir API yok; önerilen tutarlar admin panelinden
/// elle güncellenir (deploy/mağaza review gerekmez), kullanıcı formda her zaman değiştirebilir.
/// </summary>
public class SubscriptionCatalogItem : BaseEntity
{
    /// <summary>Sabit makine anahtarı (ör. <c>netflix</c>) — seed idempotency bununla sağlanır.</summary>
    public string Key { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>Iconify mdi adı (ör. <c>mdi:netflix</c>); mobil glyphmap'te yoksa istemci jenerik ikona düşer.</summary>
    public string Icon { get; set; } = string.Empty;

    /// <summary>Marka hex rengi (ör. <c>#E50914</c>).</summary>
    public string Color { get; set; } = string.Empty;

    public decimal SuggestedAmount { get; set; }

    public string Currency { get; set; } = "TRY";

    /// <summary>RecurringFrequency'nin camelCase karşılığı (daily/weekly/monthly/yearly).</summary>
    public string Frequency { get; set; } = "monthly";

    public int SortOrder { get; set; }

    /// <summary>Pasif item'lar kullanıcı şeridinde görünmez, admin listesinde kalır.</summary>
    public bool IsActive { get; set; } = true;
}
