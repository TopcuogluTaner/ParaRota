using ParaRota.Domain.Abstractions;

namespace ParaRota.Domain.Entities;

public class Budget : BaseEntity
{
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    // null = kişisel scope, dolu = aile scope. Kaydı yalnız sahibi (UserId) düzenler.
    public int? HouseholdId { get; set; }

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    // Aylık limit. Spent/Remaining/Usage runtime'da Transaction'lardan hesaplanır.
    public decimal MonthlyLimit { get; set; }

    public int Month { get; set; }   // 1..12
    public int Year { get; set; }

    // Uyarı yüzdesi (Warning seviyesine geçiş eşiği). Default %80.
    public int WarnThreshold { get; set; } = 80;
}
