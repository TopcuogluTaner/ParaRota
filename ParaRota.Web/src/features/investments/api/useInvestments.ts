import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { investmentApi } from '@shared/api/endpoints/investments';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';
import type { CreateHoldingRequest, UpdateHoldingRequest, SellHoldingRequest } from '@shared/api/types';

export function usePortfolioQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.investments.list(),
    queryFn: () => unwrap(investmentApi.portfolio()),
    enabled,
  });
}

export function useCreateHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateHoldingRequest) => unwrap(investmentApi.create(body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.investments.all });
      // Nakit bağlama gider Tx üretebilir → işlemler + dashboard tazelensin.
      void qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}

export function useUpdateHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: UpdateHoldingRequest }) =>
      unwrap(investmentApi.update(vars.id, vars.body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.investments.all });
    },
  });
}

export function useSellHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: SellHoldingRequest }) =>
      unwrap(investmentApi.sell(vars.id, vars.body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.investments.all });
      void qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}

// TEFAS fon kodu doğrulama + güncel pay değeri/adı (ekleme/alarm formu).
export function useTefasLookup() {
  return useMutation({
    mutationFn: (code: string) => unwrap(investmentApi.lookupTefas(code)),
  });
}

export function useDeleteHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(investmentApi.remove(id)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.investments.all });
    },
  });
}
