import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { budgetApi } from '@shared/api/endpoints/budgets';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';
import type { BudgetCreateRequest, BudgetUpdateRequest } from '@shared/api/types';

export function useBudgetsQuery(month?: number, year?: number) {
  return useQuery({
    queryKey: queryKeys.budgets.list(month, year),
    queryFn: () => unwrap(budgetApi.list(month, year)),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BudgetCreateRequest) => unwrap(budgetApi.create(body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: BudgetUpdateRequest }) =>
      unwrap(budgetApi.update(vars.id, vars.body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(budgetApi.remove(id)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
