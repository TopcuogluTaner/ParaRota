import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { BudgetDto, BudgetCreateRequest, BudgetUpdateRequest } from '../types';

const BASE = '/budgets';

export const budgetApi = {
  list: (month?: number, year?: number) => {
    const search = new URLSearchParams();
    if (month !== undefined) search.append('month', String(month));
    if (year !== undefined) search.append('year', String(year));
    const q = search.toString();
    return http.get<ApiResponse<BudgetDto[]>>(`${BASE}${q ? `?${q}` : ''}`);
  },
  get: (id: number) => http.get<ApiResponse<BudgetDto>>(`${BASE}/${id}`),
  create: (body: BudgetCreateRequest) => http.post<ApiResponse<BudgetDto>>(BASE, body),
  update: (id: number, body: BudgetUpdateRequest) =>
    http.put<ApiResponse<BudgetDto>>(`${BASE}/${id}`, body),
  remove: (id: number) => http.delete<ApiResponse<unknown>>(`${BASE}/${id}`),
};
