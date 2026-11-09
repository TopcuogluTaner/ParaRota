using ParaRota.Domain.Abstractions;

namespace ParaRota.Domain.Entities;

/// <summary>Bir masrafta tek üyenin payı (o üyenin bu masraftan dolayı borçlandığı tutar).</summary>
public class SharedExpenseShare : BaseEntity
{
    public int SharedExpenseId { get; set; }
    public SharedExpense SharedExpense { get; set; } = null!;

    public int MemberId { get; set; }
    public SharedPotMember Member { get; set; } = null!;

    public decimal ShareAmount { get; set; }
}
