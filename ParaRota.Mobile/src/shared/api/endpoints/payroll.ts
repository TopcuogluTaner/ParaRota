import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { PayrollResultDto, SeveranceResultDto } from '../types';

const BASE = '/payroll';

export const payrollApi = {
  grossToNet: (gross: number, year: number) =>
    http.get<ApiResponse<PayrollResultDto>>(`${BASE}/gross-to-net`, { params: { gross, year } }),
  years: () => http.get<ApiResponse<number[]>>(`${BASE}/years`),
  severance: (hireDate: string, gross: number, vacationDays: number) =>
    http.get<ApiResponse<SeveranceResultDto>>(`${BASE}/severance`, { params: { hireDate, gross, vacationDays } }),
};
