import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { CreateGoldDayRequest, GoldDayDetailDto, GoldDayListItemDto, GoldDayStatus, UpdateGoldDayRequest } from '../types';

const BASE = '/gold-days';

export const goldDayApi = {
  list: (status?: GoldDayStatus) =>
    http.get<ApiResponse<GoldDayListItemDto[]>>(BASE, { params: status ? { status } : undefined }),
  get: (id: number) => http.get<ApiResponse<GoldDayDetailDto>>(`${BASE}/${id}`),
  create: (body: CreateGoldDayRequest) => http.post<ApiResponse<GoldDayDetailDto>>(BASE, body),
  update: (id: number, body: UpdateGoldDayRequest) => http.put<ApiResponse<GoldDayDetailDto>>(`${BASE}/${id}`, body),
  remove: (id: number) => http.delete<ApiResponse<string>>(`${BASE}/${id}`),
  setContributionPaid: (contributionId: number, isPaid: boolean) =>
    http.post<ApiResponse<GoldDayDetailDto>>(`${BASE}/contributions/${contributionId}/paid`, { isPaid }),
  setMeetingCompleted: (meetingId: number, isCompleted: boolean) =>
    http.post<ApiResponse<GoldDayDetailDto>>(`${BASE}/meetings/${meetingId}/completed`, { isCompleted }),
};
