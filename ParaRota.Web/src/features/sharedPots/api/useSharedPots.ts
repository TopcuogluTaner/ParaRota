import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sharedPotApi } from '@shared/api/endpoints/sharedPots';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';
import type {
  AddSharedPotMemberRequest,
  CreateSettlementRequest,
  CreateSharedExpenseRequest,
  CreateSharedPotRequest,
  SharedPotDetailDto,
  SharedPotStatus,
  UpdateSharedPotRequest,
} from '@shared/api/types';

export function useSharedPotsQuery(status?: SharedPotStatus) {
  return useQuery({
    queryKey: queryKeys.sharedPots.list(status),
    queryFn: () => unwrap(sharedPotApi.list(status)),
  });
}

export function useSharedPotQuery(id: number | null) {
  return useQuery({
    queryKey: queryKeys.sharedPots.detail(id ?? 0),
    queryFn: () => unwrap(sharedPotApi.get(id!)),
    enabled: id !== null && id > 0,
  });
}

export function useSharedPotCandidatesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.sharedPots.candidates(),
    queryFn: () => unwrap(sharedPotApi.candidates()),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

type QC = ReturnType<typeof useQueryClient>;
const invalidateAll = (qc: QC) => void qc.invalidateQueries({ queryKey: queryKeys.sharedPots.all });
// Detay dönen mutasyonlar: detay cache'ini anında güncelle + listeyi tazele.
const syncDetail = (qc: QC, data: SharedPotDetailDto) => {
  qc.setQueryData(queryKeys.sharedPots.detail(data.id), data);
  void qc.invalidateQueries({ queryKey: queryKeys.sharedPots.list() });
};

export function useCreateSharedPot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSharedPotRequest) => unwrap(sharedPotApi.create(body)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateSharedPot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: UpdateSharedPotRequest }) => unwrap(sharedPotApi.update(vars.id, vars.body)),
    onSuccess: (data) => syncDetail(qc, data),
  });
}

export function useDeleteSharedPot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(sharedPotApi.remove(id)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useAddPotMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: AddSharedPotMemberRequest }) => unwrap(sharedPotApi.addMember(vars.id, vars.body)),
    onSuccess: (data) => syncDetail(qc, data),
  });
}

export function useRemovePotMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; memberId: number }) => unwrap(sharedPotApi.removeMember(vars.id, vars.memberId)),
    onSuccess: (data) => syncDetail(qc, data),
  });
}

export function useAddExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: CreateSharedExpenseRequest }) => unwrap(sharedPotApi.addExpense(vars.id, vars.body)),
    onSuccess: (data) => syncDetail(qc, data),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; expenseId: number }) => unwrap(sharedPotApi.deleteExpense(vars.id, vars.expenseId)),
    onSuccess: (data) => syncDetail(qc, data),
  });
}

export function useAddSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: CreateSettlementRequest }) => unwrap(sharedPotApi.addSettlement(vars.id, vars.body)),
    onSuccess: (data) => syncDetail(qc, data),
  });
}

export function useDeleteSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; settlementId: number }) => unwrap(sharedPotApi.deleteSettlement(vars.id, vars.settlementId)),
    onSuccess: (data) => syncDetail(qc, data),
  });
}
