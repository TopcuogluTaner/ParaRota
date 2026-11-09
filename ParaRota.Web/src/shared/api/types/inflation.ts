// Enflasyon (TÜFE) "paranın değeri" hesap sonucu — backend InflationConvertResultDto karşılığı.
export interface InflationSeriesPointDto {
  month: number;
  year: number;
  /** Tutarın o aydaki eşdeğeri (amount × o ay endeksi / başlangıç endeksi). */
  value: number;
}

export interface InflationConvertResultDto {
  amount: number;
  fromMonth: number;
  fromYear: number;
  /** İstenen bitiş ayı/yılı. */
  toMonth: number;
  toYear: number;
  /** Endeksin fiilen alındığı bitiş ayı (yayın gecikmesiyle istenenden eski olabilir). */
  effectiveToMonth: number;
  effectiveToYear: number;
  /** Tutarın bitiş ayındaki eşdeğeri. */
  equivalentAmount: number;
  /** Dönem boyunca kümülatif enflasyon (%, 2 hane). */
  inflationPercent: number;
  /** Bitiş/başlangıç endeks oranı (kümülatif çarpan). */
  cumulativeMultiplier: number;
  /** Yıllık ortalama bileşik enflasyon (%, 2 hane); dönem < 1 yıl ise 0. */
  annualizedPercent: number;
  /** Bitiş ayı henüz yayınlanmadığı için en güncel ay kullanıldıysa true. */
  isProvisional: boolean;
  /** Alım gücü eğrisi (seyreltilmiş, kronolojik). */
  series: InflationSeriesPointDto[];
}
