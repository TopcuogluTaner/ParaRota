import { useQuery } from '@tanstack/react-query';
import { subscriptionCatalogApi } from '@shared/api/endpoints/subscriptionCatalog';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';

// Katalog admin'in elle güncellediği yarı-statik veri — günde bir tazelemek yeterli.
export function useSubscriptionCatalogQuery() {
  return useQuery({
    queryKey: queryKeys.subscriptionCatalog.all,
    queryFn: () => unwrap(subscriptionCatalogApi.get()),
    staleTime: 24 * 60 * 60 * 1000,
  });
}
