// Türkiye brüt→net maaş hesabı (Faz 1).
export interface PayrollMonthDto {
  month: number;
  gross: number;
  sgk: number;
  unemployment: number;
  incomeTax: number; // asgari ücret istisnası düşülmüş
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
