namespace ParaRota.Domain.Enums;

public enum NotificationType
{
    BudgetWarning = 1,
    BudgetExceeded = 2,
    RecurringExecuted = 3,
    GoalCompleted = 4,
    GoalMilestone = 5,
    DebtDueSoon = 6,
    DebtPaymentRecorded = 7,
    DebtCompleted = 8,
    MonthlyDigest = 9,
    WeeklyDigest = 10,
    GoldDayMeetingSoon = 11,
    PriceAlarmTriggered = 12,
    SharedPotExpenseAdded = 13,
    SharedPotSettlementRecorded = 14,
    System = 99,
}
