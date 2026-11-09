import type { NotificationSeverity } from './notifications';

export interface AdminDispatchNotificationRequest {
  /** Tek user'a → set. Tek role → boş bırak. Broadcast → ikisi de boş. */
  targetUserId?: number;
  /** Role bazlı target. Backend "Admin" veya "User". */
  targetRole?: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  /** Opsiyonel deep link. */
  url?: string;
}
