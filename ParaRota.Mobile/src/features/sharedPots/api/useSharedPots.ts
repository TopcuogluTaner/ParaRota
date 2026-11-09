import { useMutation, useQuery } from '@tanstack/react-query';
import { sharedPotApi } from '@shared/api/endpoints/sharedPots';
import { unwrap } from '@shared/api/unwrap';
import { queryClient } from '@shared/api/queryClient';
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
    queryFn: () => unwrap(sharedPotApi.get(id as number)),
    enabled: id != null && id > 0,
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

const invalidateAll = () => queryClient.invalidateQueries({ queryKey: queryKeys.sharedPots.all });
const syncDetail = (data: SharedPotDetailDto) => {
  queryClient.setQueryData(queryKeys.sharedPots.detail(data.id), data);
  void queryClient.invalidateQueries({ queryKey: queryKeys.sharedPots.list() });
};

export function useCreateSharedPot() {
  return useMutation({ mutationFn: (body: CreateSharedPotRequest) => unwrap(sharedPotApi.create(body)), onSuccess: () => invalidateAll() });
}
export function useUpdateSharedPot() {
  return useMutation({ mutationFn: (vars: { id: number; body: UpdateSharedPotRequest }) => unwrap(sharedPotApi.update(vars.id, vars.body)), onSuccess: (data) => syncDetail(data) });
}
export function useDeleteSharedPot() {
  return useMutation({ mutationFn: (id: number) => unwrap(sharedPotApi.remove(id)), onSuccess: () => invalidateAll() });
}
export function useAddPotMember() {
  return useMutation({ mutationFn: (vars: { id: number; body: AddSharedPotMemberRequest }) => unwrap(sharedPotApi.addMember(vars.id, vars.body)), onSuccess: (data) => syncDetail(data) });
}
export function useRemovePotMember() {
  return useMutation({ mutationFn: (vars: { id: number; memberId: number }) => unwrap(sharedPotApi.removeMember(vars.id, vars.memberId)), onSuccess: (data) => syncDetail(data) });
}
export function useAddExpense() {
  return useMutation({ mutationFn: (vars: { id: number; body: CreateSharedExpenseRequest }) => unwrap(sharedPotApi.addExpense(vars.id, vars.body)), onSuccess: (data) => syncDetail(data) });
}
export function useDeleteExpense() {
  return useMutation({ mutationFn: (vars: { id: number; expenseId: number }) => unwrap(sharedPotApi.deleteExpense(vars.id, vars.expenseId)), onSuccess: (data) => syncDetail(data) });
}
export function useAddSettlement() {
  return useMutation({ mutationFn: (vars: { id: number; body: CreateSettlementRequest }) => unwrap(sharedPotApi.addSettlement(vars.id, vars.body)), onSuccess: (data) => syncDetail(data) });
}
export function useDeleteSettlement() {
  return useMutation({ mutationFn: (vars: { id: number; settlementId: number }) => unwrap(sharedPotApi.deleteSettlement(vars.id, vars.settlementId)), onSuccess: (data) => syncDetail(data) });
}
