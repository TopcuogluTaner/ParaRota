import { useMutation } from '@tanstack/react-query';
import { receiptApi } from '@shared/api/endpoints/receipts';
import { unwrap } from '@shared/api/unwrap';

export function useScanReceipt() {
  return useMutation({
    mutationFn: (file: File) => unwrap(receiptApi.scan(file)),
  });
}
