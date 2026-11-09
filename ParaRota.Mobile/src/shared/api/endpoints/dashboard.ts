import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { CashflowForecastDto, DashboardSummaryDto, InsightDto } from '../types';

const BASE = '/dashboard';

export const dashboardApi = {
  summary: (month?: number, year?: number) => {
    const search = new URLSearchParams();
    if (month !== undefined) search.append('month', String(month));
    if (year !== undefined) search.append('year', String(year));
    const q = search.toString();
    return http.get<ApiResponse<DashboardSummaryDto>>(`${BASE}/summary${q ? `?${q}` : ''}`);
  },
  insights: () => http.get<ApiResponse<InsightDto[]>>(`${BASE}/insights`),
  cashflow: () => http.get<ApiResponse<CashflowForecastDto>>(`${BASE}/cashflow`),
};
