import { useQuery, useMutation } from '@tanstack/react-query';
import { categoryApi } from '@shared/api/endpoints/categories';
import { unwrap } from '@shared/api/unwrap';
import { queryClient } from '@shared/api/queryClient';
import { queryKeys } from '@shared/api/queryKeys';
import type { CategoryCreateRequest, CategoryUpdateRequest } from '@shared/api/types';

export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: () => unwrap(categoryApi.list()),
    staleTime: 60_000,
  });
}

/** Belirli bir kapsamın kategorileri (null = kişisel). Taşıma modalında hedef scope için. */
export function useCategoriesForScopeQuery(householdId: number | null, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.categories.all, 'scope', householdId ?? 'personal'],
    queryFn: () => unwrap(categoryApi.listForScope(householdId)),
    enabled,
  });
}

export function useCreateCategory() {
  return useMutation({
    mutationFn: (body: CategoryCreateRequest) => unwrap(categoryApi.create(body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
  });
}

export function useUpdateCategory(id: number) {
  return useMutation({
    mutationFn: (body: CategoryUpdateRequest) => unwrap(categoryApi.update(id, body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
  });
}

export function useDeleteCategory() {
  return useMutation({
    mutationFn: (id: number) => unwrap(categoryApi.remove(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
  });
}
