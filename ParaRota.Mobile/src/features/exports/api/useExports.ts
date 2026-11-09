import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { exportsApi } from '@shared/api/endpoints/exports';
import type { MonthlyPdfRequest, TransactionsXlsxRequest } from '@shared/api/types';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return globalThis.btoa(binary);
}

async function persistAndShare(buffer: ArrayBuffer, fileName: string, mimeType: string) {
  const base64 = arrayBufferToBase64(buffer);
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: fileName, UTI: mimeType });
  }
  return uri;
}

export async function downloadMonthlyPdf(body: MonthlyPdfRequest): Promise<string> {
  const resp = await exportsApi.monthlyPdf(body);
  const fileName = `ParaRotam-${body.year}-${String(body.month).padStart(2, '0')}.pdf`;
  return persistAndShare(resp.data as unknown as ArrayBuffer, fileName, 'application/pdf');
}

export async function downloadTransactionsXlsx(body: TransactionsXlsxRequest): Promise<string> {
  const resp = await exportsApi.transactionsXlsx(body);
  const fileName = `ParaRotam-Transactions-${body.startDate}_${body.endDate}.xlsx`;
  return persistAndShare(
    resp.data as unknown as ArrayBuffer,
    fileName,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
}
