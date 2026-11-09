namespace ParaRota.Application.DTOs.SubscriptionCatalog;

public class SubscriptionCatalogItemDto
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public decimal SuggestedAmount { get; set; }
    public string Currency { get; set; } = "TRY";
    public string Frequency { get; set; } = "monthly";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
}
