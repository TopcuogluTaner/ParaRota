import { http } from '../httpClient';
import type { MonthlyPdfRequest, TransactionsXlsxRequest } from '../types/exports';

const BASE = '/exports';

/**
 * Faz 4 export endpoint'leri — backend binary FileStreamResult döner;
 * axios <code>responseType: 'blob'</code> ile alınır, frontend tarafında
 * URL.createObjectURL + anchor.click ile dosya indirme tetiklenir.
 */
export const exportsApi = {
  monthlyPdf: (body: MonthlyPdfRequest) =>
    http.post<Blob>(`${BASE}/monthly-pdf`, body, { responseType: 'blob' }),

  transactionsXlsx: (body: TransactionsXlsxRequest) =>
    http.post<Blob>(`${BASE}/transactions-xlsx`, body, { responseType: 'blob' }),
};
