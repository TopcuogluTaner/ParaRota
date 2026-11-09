import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { RentIncreaseResultDto } from '../types';

export const rentApi = {
  calculate: (currentRent: number, renewalMonth: number, renewalYear: number) =>
    http.get<ApiResponse<RentIncreaseResultDto>>('/rent-increase', {
      params: { currentRent, renewalMonth, renewalYear },
    }),
};
