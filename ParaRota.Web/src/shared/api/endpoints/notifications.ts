import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { NotificationDto } from '../types';

const BASE = '/notifications';

export const notificationApi = {
  list: (take = 20) =>
    http.get<ApiResponse<NotificationDto[]>>(BASE, { params: { take } }),
  unreadCount: () => http.get<ApiResponse<number>>(`${BASE}/unread-count`),
  markRead: (id: number) => http.post<ApiResponse<string>>(`${BASE}/${id}/read`),
  markAllRead: () => http.post<ApiResponse<string>>(`${BASE}/read-all`),
  remove: (id: number) => http.delete<ApiResponse<string>>(`${BASE}/${id}`),
};
