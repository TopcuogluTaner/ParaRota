import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { rentApi } from '@shared/api/endpoints/rent';
import { unwrap } from '@shared/api/unwrap';

export interface RentIncreaseParams {
  rent: number;
  month: number;
  year: number;
}

// Hesap, aynı (kira, ay, yıl) için deterministik; TÜFE günde bir kez bile değişmez → uzun staleTime.
// keepPreviousData: ay/yıl chip'leri canlı kontrole dönüştüğünde eski sonuç ekranda kalır,
// yenisi gelince yumuşakça değişir (spinner flaşı yok).
export function useRentIncreaseQuery(params: RentIncreaseParams | null) {
  return useQuery({
    queryKey: ['rent-increase', params?.rent ?? 0, params?.month ?? 0, params?.year ?? 0],
    queryFn: () => unwrap(rentApi.calculate(params!.rent, params!.month, params!.year)),
    enabled: params != null && params.rent > 0,
    staleTime: 6 * 60 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
