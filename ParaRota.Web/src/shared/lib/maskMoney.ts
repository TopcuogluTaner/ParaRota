import { usePrivacyStore } from '@shared/store/usePrivacyStore';
import { formatCurrency } from '@shared/lib/dateFormat';

/**
 * Gizlilik modu maskesi: biçimlenmiş para metnini sabit genişlikte gizler.
 * Baştaki rakam-olmayan önek (işaret + para sembolü) korunur, kalan her şey
 * "••••" olur — uzunluk sabit olduğu için tutarın BÜYÜKLÜĞÜ bile sızmaz.
 * "₺12.345,67" → "₺••••", "−₺1.250" → "−₺••••".
 */
export function maskMoney(formatted: string): string {
  const m = /^[^\d]*/.exec(formatted);
  const prefix = m ? m[0] : '';
  return `${prefix}••••`;
}

/**
 * Gizlilik moduna duyarlı para biçimleyici — Money bileşeni DIŞINDA
 * (chart tooltip, form önizleme, toast vb.) render edilen tutarlar için.
 * Money kullananlar otomatik maskelenir; bu hook kalan noktaları kapatır.
 */
export function useMoneyFmt(): (amount: number, currency?: string) => string {
  const hideAmounts = usePrivacyStore((s) => s.hideAmounts);
  return (amount, currency) => {
    const s = formatCurrency(amount, currency);
    return hideAmounts ? maskMoney(s) : s;
  };
}
