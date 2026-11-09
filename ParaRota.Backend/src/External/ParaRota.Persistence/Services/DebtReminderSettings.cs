namespace ParaRota.Persistence.Services;

/// <summary>
/// Hangfire <c>debts-due-reminders</c> job'unun davranışı için ayarlar.
/// appsettings.json içinde "DebtReminder" bölümünden yüklenir.
/// </summary>
public class DebtReminderSettings
{
    public const string SectionName = "DebtReminder";

    /// <summary>
    /// Vadesi yaklaşan borçlar için kaç gün öncesinden hatırlatma gönderilir.
    /// Varsayılan 3 gün. Aynı debt için günde 1 kez gönderilir (LastReminderSentDate guard).
    /// </summary>
    public int HorizonDays { get; set; } = 3;
}
