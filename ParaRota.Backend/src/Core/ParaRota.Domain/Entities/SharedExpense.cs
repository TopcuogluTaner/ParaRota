using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

/// <summary>Ortak kasaya girilen tek masraf: kim ödedi (PayerMember) + katılanlara bölüşüm (Shares).</summary>
public class SharedExpense : BaseEntity
{
    public int SharedPotId { get; set; }
    public SharedPot SharedPot { get; set; } = null!;

    // Masrafı ekleyen (creator). Düzenleme/silmeyi yalnız bu kullanıcı yapar.
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; }

    /// <summary>Bu masrafı fiilen ödeyen üye.</summary>
    public int PayerMemberId { get; set; }
    public SharedPotMember PayerMember { get; set; } = null!;

    public ExpenseSplitType SplitType { get; set; } = ExpenseSplitType.Equal;
    public string? Note { get; set; }

    public ICollection<SharedExpenseShare> Shares { get; set; } = new List<SharedExpenseShare>();
}
