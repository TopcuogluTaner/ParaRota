import { router } from 'expo-router';

/** Hangi premium özellik için paywall açıldı (başlık/analitik bağlamı). */
export type PremiumFeature = 'investments' | 'receipts' | 'household' | 'ai' | 'generic';

/**
 * Paywall'ı TAM EKRAN route olarak açar — Portal modal DEĞİL.
 * Paper Portal'ları mount sırasına göre üst üste biner; root'ta mount edilen
 * eski PaywallSheet, sonradan açılan form/okutma modallarının ALTINDA kalıyordu.
 * Route her zaman ekranın kendisidir, bindirme sorunu yaşamaz.
 *
 * DİKKAT: Portal tabanlı modallar route'ların da üstünde render olur — açık bir
 * modalın içinden çağırıyorsan ÖNCE kendi modalını kapat, sonra bunu çağır.
 */
export function openPaywall(feature: PremiumFeature = 'generic') {
  router.push({ pathname: '/(app)/paywall', params: { feature } });
}
