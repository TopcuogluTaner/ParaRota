import { useQuery } from '@tanstack/react-query';
import { systemStatusApi } from '@shared/api/endpoints/systemStatus';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';

export function useSystemStatus() {
  return useQuery({
    queryKey: queryKeys.systemStatus.all,
    queryFn: () => unwrap(systemStatusApi.get()),
    // Canlı his: ekran açıkken 30 sn'de bir tazele.
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}
