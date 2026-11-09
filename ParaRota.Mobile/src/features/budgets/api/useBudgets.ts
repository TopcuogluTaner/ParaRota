import { useQuery, useMutation } from '@tanstack/react-query';
import { budgetApi } from '@shared/api/endpoints/budgets';
import { unwrap } from '@shared/api/unwrap';
import { queryClient } from '@shared/api/queryClient';
import { queryKeys } from '@shared/api/queryKeys';
import type { BudgetCreateRequest, BudgetUpdateRequest } from '@shared/api/types';

export function useBudgetsQuery(month?: number, year?: number) {
  return useQuery({
    queryKey: queryKeys.budgets.list(month, year),
    queryFn: () => unwrap(budgetApi.list(month, year)),
  });
}

export function useCreateBudget() {
  return useMutation({
    mutationFn: (body: BudgetCreateRequest) => unwrap(budgetApi.create(body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateBudget(id: number) {
  return useMutation({
    mutationFn: (body: BudgetUpdateRequest) => unwrap(budgetApi.update(id, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useDeleteBudget() {
  return useMutation({
    mutationFn: (id: number) => unwrap(budgetApi.remove(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
