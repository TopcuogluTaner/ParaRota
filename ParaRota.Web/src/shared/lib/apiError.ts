import toast from 'react-hot-toast';
import i18n from '@shared/i18n';
import type { ApiResponse } from '@shared/types/apiResponse';

// ────────────────────────────────────────────────────────────────────────────
// Merkezi hata çözümleyici. Backend artık dilden bağımsız `errorCode` döner
// (bkz. backend ErrorCodes). Burada kodu kullanıcının diline çeviririz:
//   1) errorCode varsa ve `errors:<CODE>` çevirisi mevcutsa → çeviri
//   2) yoksa backend `message` (Türkçe fallback — dinamik/henüz map'lenmemiş mesajlar)
//   3) yoksa Error.message
//   4) yoksa generic `errors:UNEXPECTED`
// i18n.exists kontrolü sayesinde henüz çevrilmemiş kodlar sessizce message'a düşer
// (kademeli geçiş güvenli).
// ────────────────────────────────────────────────────────────────────────────

interface ErrorLike {
  response?: { data?: ApiResponse<unknown> };
  message?: string;
}

/**
 * Çekirdek çözümleyici: errorCode -> i18n, yoksa backend message, yoksa Error.message.
 * Hiçbiri yoksa undefined döner (çağıran kendi fallback'ini uygular).
 */
function tryResolve(err: unknown): string | undefined {
  const e = err as ErrorLike | undefined;
  const payload = e?.response?.data;

  const code = payload?.errorCode;
  if (code) {
    const key = `errors:${code}`;
    if (i18n.exists(key)) return i18n.t(key);
  }

  if (payload?.message) return payload.message;
  if (e?.message) return e.message;
  return undefined;
}

/** Bir API/mutation hatasını kullanıcının dilinde okunabilir bir mesaja çevirir. */
export function resolveApiError(err: unknown, fallbackKey = 'errors:UNEXPECTED'): string {
  return tryResolve(err) ?? i18n.t(fallbackKey);
}

/**
 * resolveApiError ile aynı çözümlemeyi yapar ama fallback olarak (i18n anahtarı değil)
 * önceden çevrilmiş bir literal string alır. getErrorMessage bunun üzerine kuruludur.
 */
export function resolveApiErrorWithFallback(err: unknown, fallbackText: string): string {
  return tryResolve(err) ?? fallbackText;
}

/** Çözümlenmiş hatayı toast (non-blocking) olarak gösterir — rutin hatalar için. */
export function notifyError(err: unknown, fallbackKey?: string): void {
  toast.error(resolveApiError(err, fallbackKey));
}

/** Başarı toast'ı — kısa, non-blocking onay. */
export function notifySuccess(message: string): void {
  toast.success(message);
}
