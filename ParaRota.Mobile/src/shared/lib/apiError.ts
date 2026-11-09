import i18n from '@shared/i18n';
import { toast } from '@shared/lib/toast';
import type { ApiResponse } from '@shared/types/apiResponse';

// ────────────────────────────────────────────────────────────────────────────
// Merkezi hata çözümleyici (Web ile birebir). Backend dilden bağımsız `errorCode`
// döner; burada kullanıcının diline çeviririz:
//   1) errorCode varsa ve `errors:<CODE>` çevirisi mevcutsa → çeviri
//   2) yoksa backend `message` (Türkçe fallback)
//   3) gövde yoksa/maskeliyse HTTP status'a göre anlamlı mesaj
//      (ör. Cloudflare origin 5xx'i kendi HTML sayfasıyla maskeler → graceful
//       JSON gövde gelmez; ham "Request failed with status code 502" GÖSTERME)
//   4) yoksa Error.message (yalnız yanıtsız ağ/timeout hataları için)
//   5) yoksa generic `errors:UNEXPECTED` (çağıran taraf fallback verebilir)
// ────────────────────────────────────────────────────────────────────────────

interface ErrorLike {
  response?: { data?: ApiResponse<unknown> | string; status?: number };
  message?: string;
}

function tryResolve(err: unknown): string | undefined {
  const e = err as ErrorLike | undefined;
  const payload = e?.response?.data;

  // 1-2) Graceful ApiResponse gövdesi (Cloudflare maskelemediyse — JSON nesne)
  if (payload && typeof payload === 'object') {
    const code = payload.errorCode;
    if (code) {
      const key = `errors:${code}`;
      if (i18n.exists(key)) return i18n.t(key);
    }
    if (payload.message) return payload.message;
  }

  // 3) Gövde yok / maskeli → HTTP status'a göre kullanıcı dostu mesaj.
  //    Ham axios "Request failed with status code 5xx" mesajını asla gösterme.
  const status = e?.response?.status;
  if (status) {
    if (status === 429 || status === 503) return i18n.t('errors:SERVICE_BUSY');
    if (status >= 500) return i18n.t('errors:SERVICE_UNAVAILABLE');
  }

  // 4) Yanıtsız (ağ/timeout) hatalarda axios mesajı bilgilendirici olabilir.
  if (!e?.response && e?.message) return e.message;
  return undefined;
}

/** Bir API/mutation hatasını kullanıcının dilinde okunabilir bir mesaja çevirir. */
export function resolveApiError(err: unknown, fallbackKey = 'errors:UNEXPECTED'): string {
  return tryResolve(err) ?? i18n.t(fallbackKey);
}

/** resolveApiError ile aynı; fallback olarak önceden çevrilmiş bir literal string alır. */
export function resolveApiErrorWithFallback(err: unknown, fallbackText: string): string {
  return tryResolve(err) ?? fallbackText;
}

/** Çözümlenmiş hatayı toast olarak gösterir — rutin hatalar için. */
export function notifyError(err: unknown, fallbackKey?: string): void {
  toast.error(resolveApiError(err, fallbackKey));
}
