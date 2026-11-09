using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Categories;

public class CategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public string? Color { get; set; }
    public TransactionType Type { get; set; }
    public bool IsSystem { get; set; }

    // Aktif scope'taki bu kategoriye bağlı işlem sayısı (soft-delete hariç). Kullanım rozeti için.
    public int TransactionCount { get; set; }
}
