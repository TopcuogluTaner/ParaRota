import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type {
  PayrollRaiseRequest,
  PayrollResultDto,
  RecurringRuleDto,
  SeveranceResultDto,
  SeveranceCeilingDto,
  SeveranceCeilingCreateRequest,
  SeveranceCeilingUpdateRequest,
} from '../types';

const BASE = '/payroll';

export const payrollApi = {
  grossToNet: (gross: number, year: number) =>
    http.get<ApiResponse<PayrollResultDto>>(`${BASE}/gross-to-net`, { params: { gross, year } }),
  years: () => http.get<ApiResponse<number[]>>(`${BASE}/years`),
  severance: (hireDate: string, gross: number, vacationDays: number) =>
    http.get<ApiResponse<SeveranceResultDto>>(`${BASE}/severance`, { params: { hireDate, gross, vacationDays } }),
  // Zam endpoint'i kuralın kendisine ait olduğu için recurring-rules altında yaşar
  // (POST /recurring-rules/{id}/payroll-raise) ama akış olarak payroll'a aittir.
  applyRaise: (ruleId: number, body: PayrollRaiseRequest) =>
    http.post<ApiResponse<RecurringRuleDto>>(`/recurring-rules/${ruleId}/payroll-raise`, body),

  // ── Admin: kıdem tavanı yönetimi (yeni dönem deploy gerektirmeden girilir) ──
  ceilingsAdminList: () => http.get<ApiResponse<SeveranceCeilingDto[]>>(`${BASE}/severance-ceilings`),
  ceilingCreate: (body: SeveranceCeilingCreateRequest) =>
    http.post<ApiResponse<SeveranceCeilingDto>>(`${BASE}/severance-ceilings`, body),
  ceilingUpdate: (id: number, body: SeveranceCeilingUpdateRequest) =>
    http.put<ApiResponse<SeveranceCeilingDto>>(`${BASE}/severance-ceilings/${id}`, body),
  ceilingRemove: (id: number) => http.delete<ApiResponse<unknown>>(`${BASE}/severance-ceilings/${id}`),
};
