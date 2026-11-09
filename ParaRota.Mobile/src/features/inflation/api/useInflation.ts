import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { inflationApi } from '@shared/api/endpoints/inflation';
import { unwrap } from '@shared/api/unwrap';

export interface InflationParams {
  amount: number;
  fromMonth: number;
  fromYear: number;
  /** null = "bugün" (en güncel yayınlanan ay). */
  toMonth: number | null;
  toYear: number | null;
}

// Hesap aynı girdiler için deterministik; TÜFE günde bir bile değişmez → uzun staleTime.
export function useInflationQuery(params: InflationParams | null) {
  return useQuery({
    queryKey: [
      'inflation-convert',
      params?.amount ?? 0,
      params?.fromMonth ?? 0,
      params?.fromYear ?? 0,
      params?.toMonth ?? 0,
      params?.toYear ?? 0,
    ],
    queryFn: () =>
      unwrap(
        inflationApi.convert(
          params!.amount,
          params!.fromMonth,
          params!.fromYear,
          params!.toMonth ?? undefined,
          params!.toYear ?? undefined,
        ),
      ),
    enabled: params != null && params.amount > 0,
    staleTime: 6 * 60 * 60 * 1000,
    // Canlı kontrolde (chip/toggle değişimi) eski sonuç ekranda kalsın, spinner flaşı olmasın.
    placeholderData: keepPreviousData,
  });
}
