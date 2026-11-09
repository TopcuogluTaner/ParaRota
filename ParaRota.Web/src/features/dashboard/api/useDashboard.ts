import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@shared/api/endpoints/dashboard';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';

export function useDashboardSummaryQuery(month?: number, year?: number) {
  // Tüm widget'lar aynı ay/yıl ile çağrıldığında query key çakışsın (tek fetch).
  // Parametresiz çağrılar içinde bulunulan ayı hedefler.
  const now = new Date();
  const resolvedMonth = month ?? now.getMonth() + 1;
  const resolvedYear = year ?? now.getFullYear();

  return useQuery({
    queryKey: queryKeys.dashboard.summary(resolvedMonth, resolvedYear),
    queryFn: () => unwrap(dashboardApi.summary(resolvedMonth, resolvedYear)),
  });
}

export function useInsightsQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.insights(),
    queryFn: () => unwrap(dashboardApi.insights()),
    staleTime: 60_000,
  });
}

export function useCashflowQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.cashflow(),
    queryFn: () => unwrap(dashboardApi.cashflow()),
    staleTime: 60_000,
  });
}
