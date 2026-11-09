import { useMutation, useQuery } from '@tanstack/react-query';
import { subscriptionCatalogApi } from '@shared/api/endpoints/subscriptionCatalog';
import { unwrap } from '@shared/api/unwrap';
import { queryClient } from '@shared/api/queryClient';
import { queryKeys } from '@shared/api/queryKeys';
import type {
  SubscriptionCatalogItemCreateRequest,
  SubscriptionCatalogItemUpdateRequest,
} from '@shared/api/types';

const invalidate = () =>
  queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionCatalog.all });

export function useSubscriptionCatalogAdminList() {
  return useQuery({
    queryKey: queryKeys.subscriptionCatalog.adminList(),
    queryFn: () => unwrap(subscriptionCatalogApi.adminList()),
  });
}

export function useCreateCatalogItem() {
  return useMutation({
    mutationFn: (body: SubscriptionCatalogItemCreateRequest) =>
      unwrap(subscriptionCatalogApi.adminCreate(body)),
    onSuccess: invalidate,
  });
}

export function useUpdateCatalogItem() {
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: SubscriptionCatalogItemUpdateRequest }) =>
      unwrap(subscriptionCatalogApi.adminUpdate(id, body)),
    onSuccess: invalidate,
  });
}

export function useDeleteCatalogItem() {
  return useMutation({
    mutationFn: (id: number) => unwrap(subscriptionCatalogApi.adminRemove(id)),
    onSuccess: invalidate,
  });
}
