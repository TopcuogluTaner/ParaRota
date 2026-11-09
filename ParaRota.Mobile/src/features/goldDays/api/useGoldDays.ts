import { useMutation, useQuery } from '@tanstack/react-query';
import { goldDayApi } from '@shared/api/endpoints/goldDays';
import { unwrap } from '@shared/api/unwrap';
import { queryClient } from '@shared/api/queryClient';
import { queryKeys } from '@shared/api/queryKeys';
import type { CreateGoldDayRequest, GoldDayDetailDto, GoldDayStatus } from '@shared/api/types';

export function useGoldDaysQuery(status?: GoldDayStatus) {
  return useQuery({
    queryKey: queryKeys.goldDays.list(status),
    queryFn: () => unwrap(goldDayApi.list(status)),
  });
}

export function useGoldDayQuery(id: number | null) {
  return useQuery({
    queryKey: queryKeys.goldDays.detail(id ?? 0),
    queryFn: () => unwrap(goldDayApi.get(id as number)),
    enabled: id != null && id > 0,
  });
}

const invalidateAll = () => queryClient.invalidateQueries({ queryKey: queryKeys.goldDays.all });
// Detay dönen mutasyonlarda: detayı anında güncelle + listeyi tazele (toggle flaşı yok).
const syncDetail = (data: GoldDayDetailDto) => {
  queryClient.setQueryData(queryKeys.goldDays.detail(data.id), data);
  void queryClient.invalidateQueries({ queryKey: queryKeys.goldDays.list() });
};

export function useCreateGoldDay() {
  return useMutation({
    mutationFn: (body: CreateGoldDayRequest) => unwrap(goldDayApi.create(body)),
    onSuccess: () => invalidateAll(),
  });
}

export function useDeleteGoldDay() {
  return useMutation({
    mutationFn: (id: number) => unwrap(goldDayApi.remove(id)),
    onSuccess: () => invalidateAll(),
  });
}

export function useSetContributionPaid() {
  return useMutation({
    mutationFn: (vars: { contributionId: number; isPaid: boolean }) =>
      unwrap(goldDayApi.setContributionPaid(vars.contributionId, vars.isPaid)),
    onSuccess: (data) => syncDetail(data),
  });
}

export function useSetMeetingCompleted() {
  return useMutation({
    mutationFn: (vars: { meetingId: number; isCompleted: boolean }) =>
      unwrap(goldDayApi.setMeetingCompleted(vars.meetingId, vars.isCompleted)),
    onSuccess: (data) => syncDetail(data),
  });
}
