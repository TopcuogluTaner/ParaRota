import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type {
  AddSharedPotMemberRequest,
  CreateSettlementRequest,
  CreateSharedExpenseRequest,
  CreateSharedPotRequest,
  SharedPotCandidateDto,
  SharedPotDetailDto,
  SharedPotListItemDto,
  SharedPotStatus,
  UpdateSharedPotRequest,
} from '../types';

const BASE = '/shared-pots';

export const sharedPotApi = {
  list: (status?: SharedPotStatus) =>
    http.get<ApiResponse<SharedPotListItemDto[]>>(BASE, { params: status ? { status } : undefined }),
  candidates: () => http.get<ApiResponse<SharedPotCandidateDto[]>>(`${BASE}/candidates`),
  get: (id: number) => http.get<ApiResponse<SharedPotDetailDto>>(`${BASE}/${id}`),
  create: (body: CreateSharedPotRequest) => http.post<ApiResponse<SharedPotDetailDto>>(BASE, body),
  update: (id: number, body: UpdateSharedPotRequest) => http.put<ApiResponse<SharedPotDetailDto>>(`${BASE}/${id}`, body),
  remove: (id: number) => http.delete<ApiResponse<string>>(`${BASE}/${id}`),
  addMember: (id: number, body: AddSharedPotMemberRequest) => http.post<ApiResponse<SharedPotDetailDto>>(`${BASE}/${id}/members`, body),
  removeMember: (id: number, memberId: number) => http.delete<ApiResponse<SharedPotDetailDto>>(`${BASE}/${id}/members/${memberId}`),
  addExpense: (id: number, body: CreateSharedExpenseRequest) => http.post<ApiResponse<SharedPotDetailDto>>(`${BASE}/${id}/expenses`, body),
  deleteExpense: (id: number, expenseId: number) => http.delete<ApiResponse<SharedPotDetailDto>>(`${BASE}/${id}/expenses/${expenseId}`),
  addSettlement: (id: number, body: CreateSettlementRequest) => http.post<ApiResponse<SharedPotDetailDto>>(`${BASE}/${id}/settlements`, body),
  deleteSettlement: (id: number, settlementId: number) => http.delete<ApiResponse<SharedPotDetailDto>>(`${BASE}/${id}/settlements/${settlementId}`),
};
