import { QueryClient } from '@tanstack/react-query';
import { useActiveHouseholdStore } from '@shared/store/useActiveHouseholdStore';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 0,
    },
  },
});

useActiveHouseholdStore.subscribe((state, prevState) => {
  if (state.activeId !== prevState.activeId) {
    queryClient.invalidateQueries();
  }
});
