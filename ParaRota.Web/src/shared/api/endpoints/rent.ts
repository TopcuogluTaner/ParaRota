import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { RentIncreaseResultDto } from '../types';

/**
 * Yasal azami kira artışı — TÜFE 12 aylık ortalamalara göre değişim (TBK m.344).
 * Backend: GET /api/v1/rent-increase?currentRent=&renewalMonth=&renewalYear=
 */
export const rentApi = {
  calculate: (currentRent: number, renewalMonth: number, renewalYear: number) =>
    http.get<ApiResponse<RentIncreaseResultDto>>('/rent-increase', {
      params: { currentRent, renewalMonth, renewalYear },
    }),
};
