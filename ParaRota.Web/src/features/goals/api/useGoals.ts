import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalApi } from '@shared/api/endpoints/goals';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';
import type { GoalCreateRequest, GoalUpdateRequest } from '@shared/api/types';

export function useGoalsQuery() {
  return useQuery({
    queryKey: queryKeys.goals.list(),
    queryFn: () => unwrap(goalApi.list()),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GoalCreateRequest) => unwrap(goalApi.create(body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.goals.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: GoalUpdateRequest }) =>
      unwrap(goalApi.update(vars.id, vars.body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.goals.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(goalApi.remove(id)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.goals.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
