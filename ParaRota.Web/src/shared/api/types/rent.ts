// Kira artışı (TBK m.344 — TÜFE 12 aylık ortalamalara göre değişim) hesap sonucu.
export interface RentIncreaseResultDto {
  currentRent: number;
  /** TÜFE 12 aylık ortalamalara göre değişim (%, 2 hane). */
  ratePercent: number;
  /** Yasal üst sınırla yeni kira (currentRent × (1 + oran)). */
  maxNewRent: number;
  increaseAmount: number;
  /** Oranın ait olduğu TÜFE ayı (etkili veri ayı). */
  referenceMonth: number;
  referenceYear: number;
  /** İstenen ayın TÜFE'si henüz açıklanmadıysa true — en son açıklanan veri kullanıldı. */
  isProvisional: boolean;
}
