namespace ParaRota.Domain.Enums;

public enum BudgetAlertLevel
{
    Normal = 1,
    Warning = 2,  // warnThreshold geçildi ama henüz aşılmadı
    Exceeded = 3, // Limit aşıldı
}
