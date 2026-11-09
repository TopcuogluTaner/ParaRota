import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '@shared/api/endpoints/categories';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';
import type {
  CategoryCreateRequest,
  CategoryUpdateRequest,
  CategoryMergeRequest,
} from '@shared/api/types';

export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: () => unwrap(categoryApi.list()),
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

export function useCategoryQuery(id: number) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id),
    queryFn: () => unwrap(categoryApi.get(id)),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CategoryCreateRequest) => unwrap(categoryApi.create(body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: CategoryUpdateRequest }) =>
      unwrap(categoryApi.update(vars.id, vars.body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(categoryApi.remove(id)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useMergeCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { sourceId: number; body: CategoryMergeRequest }) =>
      unwrap(categoryApi.merge(vars.sourceId, vars.body)),
    onSuccess: () => {
      // Birleştirme; işlem/kural/bütçe kayıtlarını hedefe taşıdığı için ilgili tüm cache'leri tazele.
      void qc.invalidateQueries({ queryKey: queryKeys.categories.all });
      void qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
