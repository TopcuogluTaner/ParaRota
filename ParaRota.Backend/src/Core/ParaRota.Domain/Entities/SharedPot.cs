using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

/// <summary>
/// Ortak Kasa — bir grup kişinin ortak masraflarını ve "kim kime borçlu" netleştirmesini
/// takip eden defter (Splitwise mantığı). Üyeler gerçek uygulama kullanıcısı (LinkedUserId)
/// ya da serbest isim olabilir. Kişisel (HouseholdId null, yalnız sahibi görür) veya aile
/// (HouseholdId dolu, ailedeki herkes görür) scope'ta yaşar. Kaydı yalnız sahibi düzenler/siler.
/// </summary>
public class SharedPot : BaseEntity
{
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public int? HouseholdId { get; set; }
    public Household? Household { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Currency { get; set; } = "TRY";
    public string? Note { get; set; }

    public SharedPotStatus Status { get; set; } = SharedPotStatus.Active;

    public ICollection<SharedPotMember> Members { get; set; } = new List<SharedPotMember>();
    public ICollection<SharedExpense> Expenses { get; set; } = new List<SharedExpense>();
    public ICollection<SharedSettlement> Settlements { get; set; } = new List<SharedSettlement>();
}
