import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@shared/api/endpoints/admin';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';
import type { AdminDispatchNotificationRequest } from '@shared/api/types';

export function useAdminDispatchNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminDispatchNotificationRequest) =>
      unwrap(adminApi.dispatchNotification(body)),
    onSuccess: () => {
      // Admin kendine de göndermişse cache'i tazele
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
