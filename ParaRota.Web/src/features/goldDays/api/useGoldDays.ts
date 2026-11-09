import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goldDayApi } from '@shared/api/endpoints/goldDays';
import { unwrap } from '@shared/api/unwrap';
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
    queryFn: () => unwrap(goldDayApi.get(id!)),
    enabled: id !== null && id > 0,
  });
}

type QC = ReturnType<typeof useQueryClient>;
const invalidateAll = (qc: QC) => void qc.invalidateQueries({ queryKey: queryKeys.goldDays.all });
// Detay yanıtı dönen mutasyonlarda: detay cache'ini anında güncelle + listeyi tazele (toggle flaşı yok).
const syncDetail = (qc: QC, data: GoldDayDetailDto) => {
  qc.setQueryData(queryKeys.goldDays.detail(data.id), data);
  void qc.invalidateQueries({ queryKey: queryKeys.goldDays.list() });
};

export function useCreateGoldDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGoldDayRequest) => unwrap(goldDayApi.create(body)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateGoldDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; name: string }) => unwrap(goldDayApi.update(vars.id, { name: vars.name })),
    onSuccess: (data) => syncDetail(qc, data),
  });
}

export function useDeleteGoldDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(goldDayApi.remove(id)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useSetContributionPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { contributionId: number; isPaid: boolean }) =>
      unwrap(goldDayApi.setContributionPaid(vars.contributionId, vars.isPaid)),
    onSuccess: (data) => syncDetail(qc, data),
  });
}

export function useSetMeetingCompleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { meetingId: number; isCompleted: boolean }) =>
      unwrap(goldDayApi.setMeetingCompleted(vars.meetingId, vars.isCompleted)),
    onSuccess: (data) => syncDetail(qc, data),
  });
}
