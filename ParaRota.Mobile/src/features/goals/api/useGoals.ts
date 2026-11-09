import { useQuery, useMutation } from '@tanstack/react-query';
import { goalApi } from '@shared/api/endpoints/goals';
import { unwrap } from '@shared/api/unwrap';
import { queryClient } from '@shared/api/queryClient';
import { queryKeys } from '@shared/api/queryKeys';
import type { GoalCreateRequest, GoalUpdateRequest } from '@shared/api/types';

export function useGoalsQuery() {
  return useQuery({
    queryKey: queryKeys.goals.list(),
    queryFn: () => unwrap(goalApi.list()),
  });
}

export function useCreateGoal() {
  return useMutation({
    mutationFn: (body: GoalCreateRequest) => unwrap(goalApi.create(body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.goals.all }),
  });
}

export function useUpdateGoal(id: number) {
  return useMutation({
    mutationFn: (body: GoalUpdateRequest) => unwrap(goalApi.update(id, body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.goals.all }),
  });
}

export function useDeleteGoal() {
  return useMutation({
    mutationFn: (id: number) => unwrap(goalApi.remove(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.goals.all }),
  });
}
