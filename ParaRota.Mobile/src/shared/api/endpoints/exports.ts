import { http } from '../httpClient';
import type { MonthlyPdfRequest, TransactionsXlsxRequest } from '../types/exports';

const BASE = '/exports';

// React Native: arraybuffer pipeline (Blob yok) — bkz. features/exports/api/useExports.ts.
export const exportsApi = {
  monthlyPdf: (body: MonthlyPdfRequest) =>
    http.post<ArrayBuffer>(`${BASE}/monthly-pdf`, body, { responseType: 'arraybuffer' }),

  transactionsXlsx: (body: TransactionsXlsxRequest) =>
    http.post<ArrayBuffer>(`${BASE}/transactions-xlsx`, body, { responseType: 'arraybuffer' }),
};
