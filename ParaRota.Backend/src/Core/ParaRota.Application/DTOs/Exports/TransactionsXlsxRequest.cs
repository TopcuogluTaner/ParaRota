using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Exports;

/// <summary>
/// İşlem listesi Excel için istek. Scope <c>X-Active-Household-Id</c> header'ından
/// çözülür. Tarih aralığı dahil (inclusive). Maksimum 12 ay; üstünde 400 döner.
/// </summary>
public class TransactionsXlsxRequest
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    /// <summary>
    /// Filtre — null/boş ise tüm kategoriler. Aktif scope'taki user'a görünür
    /// kategorilere otomatik kısıtlanır (servis tarafında).
    /// </summary>
    public IReadOnlyList<int>? CategoryIds { get; set; }

    /// <summary>
    /// Filtre — null/boş ise tüm tipler (Income + Expense).
    /// </summary>
    public IReadOnlyList<TransactionType>? Types { get; set; }
}
