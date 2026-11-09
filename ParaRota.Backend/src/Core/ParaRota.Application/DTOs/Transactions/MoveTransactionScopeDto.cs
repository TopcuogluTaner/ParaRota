namespace ParaRota.Application.DTOs.Transactions;

/// <summary>
/// Bir işlemi kişisel ↔ aile kapsamı arasında taşımak için. Yalnız kayıt sahibi taşıyabilir.
/// </summary>
public class MoveTransactionScopeDto
{
    /// <summary>Hedef kapsam: null = kişisel, dolu = aile (household) id'si.</summary>
    public int? TargetHouseholdId { get; set; }

    /// <summary>Hedef kapsamda geçerli kategori. Kişisel kategori ailede geçersiz olabileceğinden zorunlu.</summary>
    public int CategoryId { get; set; }
}
