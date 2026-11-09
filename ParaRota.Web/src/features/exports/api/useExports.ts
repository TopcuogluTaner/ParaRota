import { useMutation } from '@tanstack/react-query';
import { exportsApi } from '@shared/api/endpoints/exports';
import type { MonthlyPdfRequest, TransactionsXlsxRequest } from '@shared/api/types/exports';

/**
 * Blob response'u dosya olarak indirmeyi tetikleyen helper.
 * URL.createObjectURL + anchor.click + revokeObjectURL.
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function useMonthlyPdfMutation() {
  return useMutation({
    mutationFn: async (body: MonthlyPdfRequest) => {
      const resp = await exportsApi.monthlyPdf(body);
      const months = [...body.months].sort((a, b) => a - b);
      const suffix =
        months.length === 1
          ? String(months[0]).padStart(2, '0')
          : months.map((m) => String(m).padStart(2, '0')).join('_');
      const filename = `pararotam-${body.year}-${suffix}.pdf`;
      triggerDownload(resp.data, filename);
      return filename;
    },
  });
}

export function useTransactionsXlsxMutation() {
  return useMutation({
    mutationFn: async (body: TransactionsXlsxRequest) => {
      const resp = await exportsApi.transactionsXlsx(body);
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      const filename = `pararotam-transactions-${stamp}.xlsx`;
      triggerDownload(resp.data, filename);
      return filename;
    },
  });
}
