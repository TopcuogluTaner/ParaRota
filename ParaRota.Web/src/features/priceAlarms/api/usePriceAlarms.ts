import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { priceAlarmApi } from '@shared/api/endpoints/priceAlarms';
import { investmentApi } from '@shared/api/endpoints/investments';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';
import type { AlarmStatus, CreatePriceAlarmRequest, UpdatePriceAlarmRequest } from '@shared/api/types';

export function usePriceAlarmsQuery(status?: AlarmStatus) {
  return useQuery({
    queryKey: queryKeys.priceAlarms.list(status),
    queryFn: () => unwrap(priceAlarmApi.list(status)),
  });
}

// Güncel kur panosu — alarm kurarken eşik için referans fiyat. 5 dk taze tutulur.
export function useAssetRatesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.investments.rates(),
    queryFn: () => unwrap(investmentApi.rates()),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

type QC = ReturnType<typeof useQueryClient>;
const invalidateAll = (qc: QC) => void qc.invalidateQueries({ queryKey: queryKeys.priceAlarms.all });

export function useCreatePriceAlarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePriceAlarmRequest) => unwrap(priceAlarmApi.create(body)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdatePriceAlarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: UpdatePriceAlarmRequest }) => unwrap(priceAlarmApi.update(vars.id, vars.body)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useRearmPriceAlarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(priceAlarmApi.rearm(id)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeletePriceAlarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(priceAlarmApi.remove(id)),
    onSuccess: () => invalidateAll(qc),
  });
}
