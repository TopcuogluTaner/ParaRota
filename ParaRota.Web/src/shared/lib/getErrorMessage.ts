import { resolveApiErrorWithFallback } from '@shared/lib/apiError';

/**
 * Axios/fetch hatalarından kullanıcıya gösterilebilir tek satır mesaj çıkarır.
 * Artık errorCode-bilinçli: önce backend `errorCode` -> i18n (kullanıcının dili),
 * yoksa `response.data.message`, yoksa `e.message`, yoksa `fallback`.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  return resolveApiErrorWithFallback(error, fallback);
}
