import { useMutation, useQuery } from '@tanstack/react-query';
import { priceAlarmApi } from '@shared/api/endpoints/priceAlarms';
import { unwrap } from '@shared/api/unwrap';
import { queryClient } from '@shared/api/queryClient';
import { queryKeys } from '@shared/api/queryKeys';
import type { AlarmStatus, CreatePriceAlarmRequest, UpdatePriceAlarmRequest } from '@shared/api/types';

export function usePriceAlarmsQuery(status?: AlarmStatus) {
  return useQuery({
    queryKey: queryKeys.priceAlarms.list(status),
    queryFn: () => unwrap(priceAlarmApi.list(status)),
  });
}

const invalidateAll = () => queryClient.invalidateQueries({ queryKey: queryKeys.priceAlarms.all });

export function useCreatePriceAlarm() {
  return useMutation({
    mutationFn: (body: CreatePriceAlarmRequest) => unwrap(priceAlarmApi.create(body)),
    onSuccess: () => invalidateAll(),
  });
}

export function useUpdatePriceAlarm() {
  return useMutation({
    mutationFn: (vars: { id: number; body: UpdatePriceAlarmRequest }) => unwrap(priceAlarmApi.update(vars.id, vars.body)),
    onSuccess: () => invalidateAll(),
  });
}

export function useRearmPriceAlarm() {
  return useMutation({
    mutationFn: (id: number) => unwrap(priceAlarmApi.rearm(id)),
    onSuccess: () => invalidateAll(),
  });
}

export function useDeletePriceAlarm() {
  return useMutation({
    mutationFn: (id: number) => unwrap(priceAlarmApi.remove(id)),
    onSuccess: () => invalidateAll(),
  });
}
