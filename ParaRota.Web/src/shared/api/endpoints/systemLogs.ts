import { http } from '../httpClient';
import type { ApiResponse, PagedResponse } from '@shared/types/apiResponse';
import type { ErrorLogDto, SystemLogListParams } from '../types';

const BASE = '/system-logs';

export const systemLogsApi = {
  list: (params: SystemLogListParams) =>
    http.get<ApiResponse<PagedResponse<ErrorLogDto>>>(BASE, { params }),
  clearAll: () => http.delete<ApiResponse<number>>(BASE),
};
