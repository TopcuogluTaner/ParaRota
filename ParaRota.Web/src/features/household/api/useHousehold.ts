import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { householdApi } from '@shared/api/endpoints/household';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';
import type {
  AcceptInviteRequest,
  CreateHouseholdRequest,
  InviteToHouseholdRequest,
  LeaveHouseholdRequest,
  TransferOwnershipRequest,
  UpdateHouseholdRequest,
  UpdateMemberRoleRequest,
} from '@shared/api/types';

export function useMyHouseholdsQuery() {
  // Çift taraflı premium kuralı: aile özelliği premium'suz çalışmaz; backend
  // zaten boş liste döner, premium değilken istek hiç atılmaz.
  const isPremium = useAuthStore((s) => !!s.user?.isPremium);
  return useQuery({
    queryKey: queryKeys.households.mine(),
    queryFn: () => unwrap(householdApi.mine()),
    enabled: isPremium,
  });
}

// Premium'dan bağımsız üyelik listesi (yalnız ad/rol) — kilitli aile sayfasında
// "aileden ayrıl" akışının keşfi için.
export function useMyMembershipsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.households.memberships(),
    queryFn: () => unwrap(householdApi.myMemberships()),
    enabled,
  });
}

export function useHouseholdQuery(id: number | null) {
  return useQuery({
    queryKey: queryKeys.households.detail(id ?? 0),
    queryFn: () => unwrap(householdApi.get(id!)),
    enabled: id !== null && id > 0,
  });
}

export function useHouseholdMembersQuery(id: number | null) {
  return useQuery({
    queryKey: queryKeys.households.members(id ?? 0),
    queryFn: () => unwrap(householdApi.members(id!)),
    enabled: id !== null && id > 0,
  });
}

export function useHouseholdInvitesQuery(id: number | null) {
  return useQuery({
    queryKey: queryKeys.households.invites(id ?? 0),
    queryFn: () => unwrap(householdApi.invites(id!)),
    enabled: id !== null && id > 0,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.households.all });
  // Scope değiştiği için diğer cache'leri de tazele
  void qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
  void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
  void qc.invalidateQueries({ queryKey: queryKeys.categories.all });
  void qc.invalidateQueries({ queryKey: queryKeys.goals.all });
  void qc.invalidateQueries({ queryKey: queryKeys.recurringRules.all });
  void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
}

export function useCreateHousehold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateHouseholdRequest) => unwrap(householdApi.create(body)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateHousehold(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateHouseholdRequest) => unwrap(householdApi.update(id, body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.households.all });
    },
  });
}

export function useInviteToHousehold(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InviteToHouseholdRequest) => unwrap(householdApi.invite(id, body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.households.invites(id) });
    },
  });
}

export function useCancelInvite(householdId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: number) => unwrap(householdApi.cancelInvite(householdId, inviteId)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.households.invites(householdId) });
    },
  });
}

export function useResendInvite(householdId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: number) => unwrap(householdApi.resendInvite(householdId, inviteId)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.households.invites(householdId) });
    },
  });
}

export function useUpdateMemberRole(householdId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberUserId, body }: { memberUserId: number; body: UpdateMemberRoleRequest }) =>
      unwrap(householdApi.updateMemberRole(householdId, memberUserId, body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.households.all });
    },
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AcceptInviteRequest) => unwrap(householdApi.acceptInvite(body)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useRemoveMember(householdId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberUserId: number) => unwrap(householdApi.removeMember(householdId, memberUserId)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useLeaveHousehold(householdId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LeaveHouseholdRequest) => unwrap(householdApi.leave(householdId, body)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useTransferOwnership(householdId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TransferOwnershipRequest) =>
      unwrap(householdApi.transferOwnership(householdId, body)),
    onSuccess: () => invalidateAll(qc),
  });
}
