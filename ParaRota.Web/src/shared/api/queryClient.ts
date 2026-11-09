import { QueryClient } from '@tanstack/react-query';
import { useActiveHouseholdStore } from '@features/household/store/useActiveHouseholdStore';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s finansal veri için fazla agresif geliyordu; 15s daha makul.
      // Feature-specific override (dashboard 5s, categories 60s) ileride
      // useQuery hook'larında eklenecek.
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

// Aktif household değiştiğinde tüm cache'i invalidate et — backend artık
// X-Active-Household-Id header'ına göre filtrelediği için stale veriler
// yanlış scope'a aitmiş gibi görünür.
useActiveHouseholdStore.subscribe((state, prevState) => {
  if (state.activeId !== prevState.activeId) {
    queryClient.invalidateQueries();
  }
});
