import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { GoalDto, GoalCreateRequest, GoalUpdateRequest } from '../types';

const BASE = '/goals';

export const goalApi = {
  list: () => http.get<ApiResponse<GoalDto[]>>(BASE),
  get: (id: number) => http.get<ApiResponse<GoalDto>>(`${BASE}/${id}`),
  create: (body: GoalCreateRequest) => http.post<ApiResponse<GoalDto>>(BASE, body),
  update: (id: number, body: GoalUpdateRequest) =>
    http.put<ApiResponse<GoalDto>>(`${BASE}/${id}`, body),
  remove: (id: number) => http.delete<ApiResponse<unknown>>(`${BASE}/${id}`),
};
