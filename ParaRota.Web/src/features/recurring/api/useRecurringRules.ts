import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recurringRuleApi } from '@shared/api/endpoints/recurringRules';
import { unwrap } from '@shared/api/unwrap';
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

export function useRecurringRuleQuery(id: number) {
  return useQuery({
    queryKey: queryKeys.recurringRules.detail(id),
    queryFn: () => unwrap(recurringRuleApi.get(id)),
    enabled: Number.isFinite(id) && id > 0,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.recurringRules.all });
}

function invalidateAfterRun(qc: ReturnType<typeof useQueryClient>) {
  // Run-now ile transaction üretilir → ilgili cache'leri tazele.
  void qc.invalidateQueries({ queryKey: queryKeys.recurringRules.all });
  void qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
  void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
  void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
}

export function useCreateRecurringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecurringRuleCreateRequest) => unwrap(recurringRuleApi.create(body)),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateRecurringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: RecurringRuleUpdateRequest }) =>
      unwrap(recurringRuleApi.update(vars.id, vars.body)),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteRecurringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(recurringRuleApi.remove(id)),
    onSuccess: () => invalidate(qc),
  });
}

export function useRunRecurringRuleNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(recurringRuleApi.runNow(id)),
    onSuccess: () => invalidateAfterRun(qc),
  });
}
