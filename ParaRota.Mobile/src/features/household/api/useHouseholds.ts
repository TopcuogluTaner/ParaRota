import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { householdApi } from '@shared/api/endpoints/household';
import { unwrap } from '@shared/api/unwrap';
import { queryClient } from '@shared/api/queryClient';
import { queryKeys } from '@shared/api/queryKeys';
import type {
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
    staleTime: 60_000,
    enabled: isPremium,
  });
}

export function useHouseholdsMine() {
  return useMyHouseholdsQuery();
}

// Premium'dan bağımsız üyelik listesi (yalnız ad/rol) — kilitli aile ekranında
// "aileden ayrıl" akışının keşfi için.
export function useMyMembershipsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.households.memberships(),
    queryFn: () => unwrap(householdApi.myMemberships()),
    enabled,
  });
}

export function useHouseholdMembersQuery(id: number | null) {
  return useQuery({
    queryKey: queryKeys.households.members(id ?? 0),
    queryFn: () => unwrap(householdApi.members(id as number)),
    enabled: id != null,
  });
}

export function useHouseholdInvitesQuery(id: number | null) {
  return useQuery({
    queryKey: queryKeys.households.invites(id ?? 0),
    queryFn: () => unwrap(householdApi.invites(id as number)),
    enabled: id != null,
  });
}

export function useCreateHousehold() {
  return useMutation({
    mutationFn: (body: CreateHouseholdRequest) => unwrap(householdApi.create(body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.households.all }),
  });
}

export function useUpdateHousehold(id: number) {
  return useMutation({
    mutationFn: (body: UpdateHouseholdRequest) => unwrap(householdApi.update(id, body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.households.all }),
  });
}

export function useInviteToHousehold(id: number) {
  return useMutation({
    mutationFn: (body: InviteToHouseholdRequest) => unwrap(householdApi.invite(id, body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.households.invites(id) }),
  });
}

export function useCancelInvite(id: number) {
  return useMutation({
    mutationFn: (inviteId: number) => unwrap(householdApi.cancelInvite(id, inviteId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.households.invites(id) }),
  });
}

export function useResendInvite(id: number) {
  return useMutation({
    mutationFn: (inviteId: number) => unwrap(householdApi.resendInvite(id, inviteId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.households.invites(id) }),
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: (token: string) => unwrap(householdApi.acceptInvite({ token })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.households.all }),
  });
}

export function useRemoveMember(id: number) {
  return useMutation({
    mutationFn: (memberUserId: number) => unwrap(householdApi.removeMember(id, memberUserId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.households.members(id) }),
  });
}

export function useUpdateMemberRole(id: number) {
  return useMutation({
    mutationFn: (params: { memberUserId: number; body: UpdateMemberRoleRequest }) =>
      unwrap(householdApi.updateMemberRole(id, params.memberUserId, params.body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.households.members(id) }),
  });
}

export function useLeaveHousehold(id: number) {
  return useMutation({
    mutationFn: (body: LeaveHouseholdRequest) => unwrap(householdApi.leave(id, body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.households.all }),
  });
}

export function useTransferOwnership(id: number) {
  return useMutation({
    mutationFn: (body: TransferOwnershipRequest) => unwrap(householdApi.transferOwnership(id, body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.households.all }),
  });
}
