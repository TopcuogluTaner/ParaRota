using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Ai;

/// <summary>
/// "dün akşam 450 lira yemek" gibi serbest metinden çıkarılan işlem önerisi.
/// İstemci bunu hızlı giriş formuna ÖN DOLDURUR — kullanıcı onaylamadan kayıt oluşmaz.
/// </summary>
public class ParsedTransactionDto
{
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";
    public TransactionType Type { get; set; } = TransactionType.Expense;

    /// <summary>Kullanıcının kategorileri arasında eşleşme bulunduysa dolu.</summary>
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }

    /// <summary>"dün", "geçen cuma" gibi göreli ifadeler çözülmüş hali; yoksa bugün.</summary>
    public DateTime TransactionDate { get; set; }

    /// <summary>2-4 kelimelik kısa başlık (not alanına önerilir).</summary>
    public string? Description { get; set; }
}
