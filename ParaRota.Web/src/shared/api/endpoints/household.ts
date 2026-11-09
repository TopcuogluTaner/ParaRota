import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type {
  AcceptInviteRequest,
  AcceptInviteResult,
  CreateHouseholdRequest,
  HouseholdDto,
  HouseholdInviteDto,
  HouseholdMemberDto,
  InviteToHouseholdRequest,
  LeaveHouseholdRequest,
  TransferOwnershipRequest,
  UpdateHouseholdRequest,
  UpdateMemberRoleRequest,
} from '../types/household';

const BASE = '/households';

export const householdApi = {
  mine: () => http.get<ApiResponse<HouseholdDto[]>>(BASE),
  // Premium'dan bağımsız üyelik listesi — premium'u biten üye aileden ayrılabilsin diye.
  myMemberships: () => http.get<ApiResponse<HouseholdDto[]>>(`${BASE}/my-memberships`),
  get: (id: number) => http.get<ApiResponse<HouseholdDto>>(`${BASE}/${id}`),
  create: (body: CreateHouseholdRequest) => http.post<ApiResponse<HouseholdDto>>(BASE, body),
  update: (id: number, body: UpdateHouseholdRequest) =>
    http.put<ApiResponse<HouseholdDto>>(`${BASE}/${id}`, body),

  members: (id: number) => http.get<ApiResponse<HouseholdMemberDto[]>>(`${BASE}/${id}/members`),
  invites: (id: number) => http.get<ApiResponse<HouseholdInviteDto[]>>(`${BASE}/${id}/invites`),

  invite: (id: number, body: InviteToHouseholdRequest) =>
    http.post<ApiResponse<HouseholdInviteDto>>(`${BASE}/${id}/invites`, body),
  cancelInvite: (id: number, inviteId: number) =>
    http.delete<ApiResponse<string>>(`${BASE}/${id}/invites/${inviteId}`),
  resendInvite: (id: number, inviteId: number) =>
    http.post<ApiResponse<HouseholdInviteDto>>(`${BASE}/${id}/invites/${inviteId}/resend`),
  acceptInvite: (body: AcceptInviteRequest) =>
    http.post<ApiResponse<AcceptInviteResult>>(`${BASE}/accept-invite`, body),

  removeMember: (id: number, memberUserId: number) =>
    http.delete<ApiResponse<string>>(`${BASE}/${id}/members/${memberUserId}`),
  updateMemberRole: (id: number, memberUserId: number, body: UpdateMemberRoleRequest) =>
    http.patch<ApiResponse<string>>(`${BASE}/${id}/members/${memberUserId}/role`, body),
  leave: (id: number, body: LeaveHouseholdRequest) =>
    http.post<ApiResponse<string>>(`${BASE}/${id}/leave`, body),
  transferOwnership: (id: number, body: TransferOwnershipRequest) =>
    http.post<ApiResponse<string>>(`${BASE}/${id}/transfer-ownership`, body),
};
