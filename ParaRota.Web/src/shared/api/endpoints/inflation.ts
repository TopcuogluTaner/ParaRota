import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { InflationConvertResultDto } from '../types';

/**
 * Paranın değeri — tutarın TÜFE bazında iki tarih arası eşdeğeri.
 * Backend: GET /api/v1/inflation/convert?amount=&fromMonth=&fromYear=[&toMonth=&toYear=]
 * Bitiş ayı/yılı verilmezse en güncel yayınlanan ay kullanılır.
 */
export const inflationApi = {
  convert: (
    amount: number,
    fromMonth: number,
    fromYear: number,
    toMonth?: number,
    toYear?: number,
  ) =>
    http.get<ApiResponse<InflationConvertResultDto>>('/inflation/convert', {
      params: { amount, fromMonth, fromYear, toMonth, toYear },
    }),
};
