// Türkiye brüt→net maaş hesabı (resmi kümülatif gelir vergisi modeli).
// Backend: GET /payroll/gross-to-net?gross=X&year=Y → PayrollResultDto
export interface PayrollMonthDto {
  month: number;
  gross: number;
  sgk: number;
  unemployment: number;
  /** Asgari ücret istisnası düşülmüş gelir vergisi. */
  incomeTax: number;
  stampTax: number;
  net: number;
  cumulativeBase: number;
}

export interface PayrollResultDto {
  year: number;
  grossMonthly: number;
  annualGross: number;
  annualNet: number;
  annualSgk: number;
  annualUnemployment: number;
  annualIncomeTax: number;
  annualStamp: number;
  months: PayrollMonthDto[];
}

/** Maaş otomatiğine zam: yürürlük tarihinden itibaren geçerli yeni brüt aylık maaş. */
export interface PayrollRaiseRequest {
  gross: number;
  effectiveDate: string;
}

// ── Kıdem & İhbar Tazminatı ─────────────────────────────────────────────────
// Kıdem net (yalnız damga kesilir); ihbar/izin vergiye tabi olduğundan BRÜT döner.

export interface SeveranceResultDto {
  year: number;
  serviceYears: number;
  serviceMonths: number;
  serviceDays: number;
  totalServiceDays: number;
  eligibleForSeverance: boolean;
  severanceCeiling: number;
  ceilingApplied: boolean;
  cappedMonthlyGross: number;
  severanceGross: number;
  severanceStamp: number;
  severanceNet: number;
  noticeWeeks: number;
  noticeGross: number;
  vacationGross: number;
  totalGross: number;
  totalEstimated: number;
}

// ── Kıdem tavanı (admin) ────────────────────────────────────────────────────
// Tavan dönemsel (Ocak/Temmuz) değişir, resmi API yok → admin panelden DB'de yönetilir.
export interface SeveranceCeilingDto {
  id: number;
  /** Yürürlük başlangıcı (ISO tarih, ör. "2026-07-01"). */
  effectiveFrom: string;
  amount: number;
  note?: string | null;
}

export interface SeveranceCeilingCreateRequest {
  effectiveFrom: string;
  amount: number;
  note?: string | null;
}

export type SeveranceCeilingUpdateRequest = SeveranceCeilingCreateRequest;
