import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { loanApi } from '@shared/api/endpoints/loan';
import { unwrap } from '@shared/api/unwrap';
import type { LoanType } from '@shared/api/types';

export interface LoanParams {
  amount: number;
  monthlyRatePercent: number;
  termMonths: number;
  loanType: LoanType;
  dosyaMasrafi: number;
}

// Saf matematik → uzun staleTime. keepPreviousData: girdi değişince eski sonuç kalır.
export function useLoanQuery(params: LoanParams | null) {
  return useQuery({
    queryKey: [
      'loan-cost',
      params?.amount ?? 0,
      params?.monthlyRatePercent ?? 0,
      params?.termMonths ?? 0,
      params?.loanType ?? '',
      params?.dosyaMasrafi ?? 0,
    ],
    queryFn: () =>
      unwrap(loanApi.calculate(params!.amount, params!.monthlyRatePercent, params!.termMonths, params!.loanType, params!.dosyaMasrafi)),
    enabled: params != null && params.amount > 0 && params.termMonths > 0,
    staleTime: 60 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
