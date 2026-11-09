import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { AlarmStatus, CreatePriceAlarmRequest, PriceAlarmDto, UpdatePriceAlarmRequest } from '../types';

const BASE = '/price-alarms';

export const priceAlarmApi = {
  list: (status?: AlarmStatus) =>
    http.get<ApiResponse<PriceAlarmDto[]>>(BASE, { params: status ? { status } : undefined }),
  create: (body: CreatePriceAlarmRequest) => http.post<ApiResponse<PriceAlarmDto>>(BASE, body),
  update: (id: number, body: UpdatePriceAlarmRequest) => http.put<ApiResponse<PriceAlarmDto>>(`${BASE}/${id}`, body),
  rearm: (id: number) => http.post<ApiResponse<PriceAlarmDto>>(`${BASE}/${id}/rearm`, {}),
  remove: (id: number) => http.delete<ApiResponse<string>>(`${BASE}/${id}`),
};
