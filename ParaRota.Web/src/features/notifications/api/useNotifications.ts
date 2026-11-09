import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '@shared/api/endpoints/notifications';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';

// SignalR-driven invalidation notificationBus tarafında. Buradaki polling
// yedek görevi: SignalR connection patlamış olabilir, offline → online geçiş
// olabilir. 5 dk arayla yeniden çek — düşük frequency.
const FALLBACK_REFETCH_MS = 5 * 60 * 1000;

export function useNotificationsQuery(take = 20) {
  return useQuery({
    queryKey: queryKeys.notifications.list(take),
    queryFn: () => unwrap(notificationApi.list(take)),
    refetchInterval: FALLBACK_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useUnreadCountQuery() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => unwrap(notificationApi.unreadCount()),
    refetchInterval: FALLBACK_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(notificationApi.markRead(id)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(notificationApi.markAllRead()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(notificationApi.remove(id)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
