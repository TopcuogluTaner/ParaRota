// Kira artışı (TBK m.344 — TÜFE 12 aylık ortalamalara göre değişim) hesap sonucu.
export interface RentIncreaseResultDto {
  currentRent: number;
  ratePercent: number;
  maxNewRent: number;
  increaseAmount: number;
  referenceMonth: number;
  referenceYear: number;
  // İstenen ayın TÜFE'si henüz açıklanmadıysa true — en son açıklanan veri kullanıldı.
  isProvisional: boolean;
}
