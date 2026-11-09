namespace ParaRota.Application.DTOs.SubscriptionCatalog;

/// <summary><c>Key</c> sabittir (seed idempotency) — güncellemede değiştirilemez.</summary>
public class UpdateSubscriptionCatalogItemDto
{
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public decimal SuggestedAmount { get; set; }
    public string Currency { get; set; } = "TRY";
    public string Frequency { get; set; } = "monthly";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
