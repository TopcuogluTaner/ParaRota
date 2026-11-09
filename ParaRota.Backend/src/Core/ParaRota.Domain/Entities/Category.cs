using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

public class Category : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string? Emoji { get; set; }
    public string? Color { get; set; }
    public TransactionType Type { get; set; }

    // Sistem-default kategoriler de artık per-user kopyalandığı için UserId her zaman dolu olmalı.
    // Yine de eski sistem-shared kayıtlar (varsa) için nullable bırakıyoruz.
    public int? UserId { get; set; }
    public AppUser? User { get; set; }

    // null = kişisel scope, dolu = aile scope. Kaydı yalnız sahibi (UserId) düzenler.
    public int? HouseholdId { get; set; }

    // Sistem seed'inden gelen kategoriler. Type değiştirilemez, silinemez.
    public bool IsSystem { get; set; }

    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public ICollection<RecurringRule> RecurringRules { get; set; } = new List<RecurringRule>();
}
