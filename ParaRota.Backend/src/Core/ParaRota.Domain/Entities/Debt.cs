using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Enums;

namespace ParaRota.Domain.Entities;

public class Debt : BaseEntity
{
    // Kayıt sahibi (creator).
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    // null = kişisel scope, dolu = aile scope. Kaydı yalnız sahibi (UserId) düzenler.
    public int? HouseholdId { get; set; }
    public Household? Household { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public DebtKind Kind { get; set; }

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";

    // Başlangıçta Amount değerine eşit; ödemeyle azalır.
    public decimal RemainingAmount { get; set; }

    public string CounterpartyName { get; set; } = string.Empty;

    // Yıllık % (0..100), opsiyonel.
    public decimal? InterestRate { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime? DueDate { get; set; }

    public int? InstallmentCount { get; set; }
    public DebtFrequency? InstallmentFrequency { get; set; }

    public PaymentMode PaymentMode { get; set; } = PaymentMode.Manual;

    // PaymentMode == Auto modunda otomatik yaratılan RecurringRule referansı.
    public int? LinkedRecurringRuleId { get; set; }
    public RecurringRule? LinkedRecurringRule { get; set; }

    public DebtStatus Status { get; set; } = DebtStatus.Active;

    // Sıradaki ödeme tarihi — bildirim/aging sorguları için.
    public DateTime? NextDueDate { get; set; }

    // Hangfire job son hatırlatıcı gönderdiği tarih (gün granülarlığı). NextDueDate ile birlikte
    // aynı NextDueDate için günde 1 reminder garantisi. Migration: 20260517210000_AddDebtLastReminder.
    public DateTime? LastReminderSentDate { get; set; }

    public ICollection<DebtPayment> Payments { get; set; } = new List<DebtPayment>();
}
