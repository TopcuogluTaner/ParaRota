import { useQuery, useMutation } from '@tanstack/react-query';
import { notificationApi } from '@shared/api/endpoints/notifications';
import { unwrap } from '@shared/api/unwrap';
import { queryClient } from '@shared/api/queryClient';
import { queryKeys } from '@shared/api/queryKeys';

export function useNotificationsQuery(take = 20) {
  return useQuery({
    queryKey: queryKeys.notifications.list(take),
    queryFn: () => unwrap(notificationApi.list(take)),
    staleTime: 30_000,
  });
}

export function useNotificationUnreadCountQuery() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => unwrap(notificationApi.unreadCount()),
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: (id: number) => unwrap(notificationApi.markRead(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}

export function useMarkAllNotificationsRead() {
  return useMutation({
    mutationFn: () => unwrap(notificationApi.markAllRead()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}

export function useRemoveNotification() {
  return useMutation({
    mutationFn: (id: number) => unwrap(notificationApi.remove(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}
