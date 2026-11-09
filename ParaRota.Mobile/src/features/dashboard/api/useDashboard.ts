import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@shared/api/endpoints/dashboard';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';

export function useDashboardSummaryQuery(month?: number, year?: number) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(month, year),
    queryFn: () => unwrap(dashboardApi.summary(month, year)),
    staleTime: 5_000,
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
