import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { ScannedReceipt } from '../types/receipts';

const BASE = '/receipts';

export const receiptApi = {
  scan: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.post<ApiResponse<ScannedReceipt>>(`${BASE}/scan`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
