// Backend enum'ları ile aynı string değerler (JsonStringEnumConverter + CamelCase).
export type NotificationType =
  | 'budgetWarning'
  | 'budgetExceeded'
  | 'recurringExecuted'
  | 'goalCompleted'
  | 'goalMilestone'
  | 'debtDueSoon'
  | 'debtPaymentRecorded'
  | 'debtCompleted'
  | 'monthlyDigest'
  | 'weeklyDigest'
  | 'system';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface NotificationDto {
  id: number;
  type: NotificationType;
  severity: NotificationSeverity;
  titleKey: string;
  messageKey: string;
  /** JSON serialized payload — interpolation için (örn. {"categoryName":"Market","overBy":18}). */
  payload?: string;
  refType?: string;
  refId?: number;
  isRead: boolean;
  createdDate: string;
}
