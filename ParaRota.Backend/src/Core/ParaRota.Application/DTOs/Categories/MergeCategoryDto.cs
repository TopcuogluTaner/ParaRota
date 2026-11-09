namespace ParaRota.Application.DTOs.Categories;

// Kaynak kategoriyi hedef kategoriye birleştirir; tüm işlem/kural kayıtları hedefe taşınır,
// kaynak kategori soft-delete edilir.
public class MergeCategoryDto
{
    public int TargetCategoryId { get; set; }
}
