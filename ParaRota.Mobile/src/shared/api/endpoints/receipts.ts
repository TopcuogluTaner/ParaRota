import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { ScannedReceipt } from '../types/receipts';

const BASE = '/receipts';

export interface ReceiptUploadFile {
  uri: string;
  name: string;
  type: string;
}

export const receiptApi = {
  scan: (file: ReceiptUploadFile) => {
    const formData = new FormData();
    formData.append('file', file as unknown as Blob);
    return http.post<ApiResponse<ScannedReceipt>>(`${BASE}/scan`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // OCR doğası gereği yavaş + backend 503'te retry/model-zinciri yapıyor →
      // global 30s timeout yetmiyor; bu isteğe özel 60s tanı.
      timeout: 60000,
    });
  },
};
