import { useQuery, useMutation } from '@tanstack/react-query';
import { investmentApi } from '@shared/api/endpoints/investments';
import { unwrap } from '@shared/api/unwrap';
import { queryClient } from '@shared/api/queryClient';
import { queryKeys } from '@shared/api/queryKeys';
import type { CreateHoldingRequest, UpdateHoldingRequest, SellHoldingRequest } from '@shared/api/types';

export function usePortfolioQuery() {
  return useQuery({
    queryKey: queryKeys.investments.list(),
    queryFn: () => unwrap(investmentApi.portfolio()),
  });
}

export function useRatesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.investments.rates(),
    queryFn: () => unwrap(investmentApi.rates()),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateHolding() {
  return useMutation({
    mutationFn: (body: CreateHoldingRequest) => unwrap(investmentApi.create(body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.investments.all });
      // Nakit bağlama gider Tx üretebilir → işlemler + dashboard + bütçeler tazelensin.
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}

export function useUpdateHolding(id: number) {
  return useMutation({
    mutationFn: (body: UpdateHoldingRequest) => unwrap(investmentApi.update(id, body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.investments.all }),
  });
}

export function useSellHolding(id: number) {
  return useMutation({
    mutationFn: (body: SellHoldingRequest) => unwrap(investmentApi.sell(id, body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.investments.all });
      // Satış geliri Tx üretebilir → işlemler + dashboard + bütçeler tazelensin.
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}

// TEFAS fon kodu doğrulama + güncel pay değeri/adı (ekleme/alarm formu).
export function useTefasLookup() {
  return useMutation({
    mutationFn: (code: string) => unwrap(investmentApi.lookupTefas(code)),
  });
}

// TEFAS fon arama (kod/ad) — aramalı seçici. query boşken de ilk N fonu döndürür.
export function useTefasSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ['tefasSearch', query.trim().toUpperCase()],
    queryFn: () => unwrap(investmentApi.searchTefas(query.trim())),
    enabled,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useDeleteHolding() {
  return useMutation({
    mutationFn: (id: number) => unwrap(investmentApi.remove(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.investments.all }),
  });
}
