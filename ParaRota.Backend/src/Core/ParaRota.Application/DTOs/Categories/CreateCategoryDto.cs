using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Categories;

public class CreateCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public string? Color { get; set; }
    public TransactionType Type { get; set; }

    // Aile scope'u için opsiyonel — verilirse kullanıcı o household'ın aktif üyesi olmalı.
    public int? HouseholdId { get; set; }
}
