import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type {
  RecurringRuleDto,
  RecurringRuleCreateRequest,
  RecurringRuleUpdateRequest,
  SubscriptionRadarDto,
} from '../types';

const BASE = '/recurring-rules';

export const recurringRuleApi = {
  list: (isActive?: boolean) => {
    const q = isActive !== undefined ? `?isActive=${isActive}` : '';
    return http.get<ApiResponse<RecurringRuleDto[]>>(`${BASE}${q}`);
  },
  get: (id: number) => http.get<ApiResponse<RecurringRuleDto>>(`${BASE}/${id}`),
  radar: () => http.get<ApiResponse<SubscriptionRadarDto>>(`${BASE}/subscription-radar`),
  create: (body: RecurringRuleCreateRequest) => http.post<ApiResponse<RecurringRuleDto>>(BASE, body),
  update: (id: number, body: RecurringRuleUpdateRequest) =>
    http.put<ApiResponse<RecurringRuleDto>>(`${BASE}/${id}`, body),
  remove: (id: number) => http.delete<ApiResponse<unknown>>(`${BASE}/${id}`),
  runNow: (id: number) => http.post<ApiResponse<number>>(`${BASE}/${id}/run-now`),
};
