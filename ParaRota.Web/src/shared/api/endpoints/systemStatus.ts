import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { SystemStatusDto } from '../types';

export const systemStatusApi = {
  get: () => http.get<ApiResponse<SystemStatusDto>>('/system-status'),
};
