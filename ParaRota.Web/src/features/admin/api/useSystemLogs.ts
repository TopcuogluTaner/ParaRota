import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { systemLogsApi } from '@shared/api/endpoints/systemLogs';
import { unwrap } from '@shared/api/unwrap';
import { queryClient } from '@shared/api/queryClient';
import { queryKeys } from '@shared/api/queryKeys';

const PAGE_SIZE = 20;

export function useSystemLogs(page: number, search: string, minStatusCode: number) {
  return useQuery({
    queryKey: queryKeys.systemLogs.list(page, search, minStatusCode),
    queryFn: () =>
      unwrap(
        systemLogsApi.list({
          pageNumber: page,
          pageSize: PAGE_SIZE,
          search: search.trim() || undefined,
          minStatusCode: minStatusCode || undefined,
        }),
      ),
    // Sayfa değişiminde eski veriyi tut (titreme olmasın).
    placeholderData: keepPreviousData,
  });
}

export function useClearSystemLogs() {
  return useMutation({
    mutationFn: () => unwrap(systemLogsApi.clearAll()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.systemLogs.all }),
  });
}
