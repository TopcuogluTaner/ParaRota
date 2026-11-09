import { useMutation } from '@tanstack/react-query';
import { receiptApi, type ReceiptUploadFile } from '@shared/api/endpoints/receipts';
import { unwrap } from '@shared/api/unwrap';

export function useScanReceipt() {
  return useMutation({
    mutationFn: (file: ReceiptUploadFile) => unwrap(receiptApi.scan(file)),
  });
}
