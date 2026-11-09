namespace ParaRota.Application.DTOs.Categories;

public class UpdateCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public string? Color { get; set; }
    // Type ve IsSystem güncellenmez; sistem kategorisinin türü ve sistem flag'i sabittir.
}
