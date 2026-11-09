import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { AdminDispatchNotificationRequest } from '../types/admin';

export const adminApi = {
  dispatchNotification: (body: AdminDispatchNotificationRequest) =>
    http.post<ApiResponse<number>>('/notifications/admin/dispatch', body),
};
