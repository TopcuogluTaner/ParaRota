import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { RegisterDeviceTokenRequest } from '../types';

const BASE = '/devices';

export const deviceApi = {
  register: (body: RegisterDeviceTokenRequest) =>
    http.post<ApiResponse<string>>(`${BASE}/register`, body),
  revoke: (token: string) =>
    http.delete<ApiResponse<string>>(`${BASE}/${encodeURIComponent(token)}`),
};
