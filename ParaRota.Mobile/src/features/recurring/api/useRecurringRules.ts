import { useQuery, useMutation } from '@tanstack/react-query';
import { recurringRuleApi } from '@shared/api/endpoints/recurringRules';
import { unwrap } from '@shared/api/unwrap';
import { queryClient } from '@shared/api/queryClient';
import { queryKeys } from '@shared/api/queryKeys';
import type {
  RecurringRuleCreateRequest,
  RecurringRuleUpdateRequest,
} from '@shared/api/types';

export function useRecurringRulesQuery(isActive?: boolean) {
  return useQuery({
    queryKey: queryKeys.recurringRules.list(isActive),
    queryFn: () => unwrap(recurringRuleApi.list(isActive)),
  });
}

export function useSubscriptionRadarQuery() {
  return useQuery({
    queryKey: queryKeys.recurringRules.radar(),
    queryFn: () => unwrap(recurringRuleApi.radar()),
    staleTime: 60_000,
  });
}

export function useCreateRecurringRule() {
  return useMutation({
    mutationFn: (body: RecurringRuleCreateRequest) => unwrap(recurringRuleApi.create(body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.recurringRules.all }),
  });
}

export function useUpdateRecurringRule(id: number) {
  return useMutation({
    mutationFn: (body: RecurringRuleUpdateRequest) => unwrap(recurringRuleApi.update(id, body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.recurringRules.all }),
  });
}

export function useDeleteRecurringRule() {
  return useMutation({
    mutationFn: (id: number) => unwrap(recurringRuleApi.remove(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.recurringRules.all }),
  });
}

export function useApplyPayrollRaise() {
  return useMutation({
    mutationFn: ({ id, gross, effectiveDate }: { id: number; gross: number; effectiveDate: string }) =>
      unwrap(recurringRuleApi.payrollRaise(id, { gross, effectiveDate })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringRules.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useRunRecurringNow() {
  return useMutation({
    mutationFn: (id: number) => unwrap(recurringRuleApi.runNow(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringRules.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
