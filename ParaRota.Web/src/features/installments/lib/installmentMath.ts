import type { RecurringRuleDto } from '@shared/api/types';

// ────────────────────────────────────────────────────────────────────────────
// Taksit planı matematiği — sayfa (hero + rahatlama takvimi) ve form önizlemesi
// aynı hesapları paylaşır. Mobil InstallmentsScreen ile birebir paritede.
// ────────────────────────────────────────────────────────────────────────────

export type PlanState = 'active' | 'done' | 'closed';

/** Plan durumu: tamamı ödendi → done; erken kapatıldı (pasif + eksik) → closed; diğeri active. */
export function planState(r: RecurringRuleDto): PlanState {
  const count = r.installmentCount ?? 0;
  if (r.paidInstallments >= count) return 'done';
  if (!r.isActive) return 'closed';
  return 'active';
}

/**
 * Verilen ayda (y, m=1..12) bu planın taksidi var mı; varsa tutarı.
 * Son ayda küsurat kapanışı: toplam − (n−1)×aylık.
 */
export function amountInMonth(r: RecurringRuleDto, y: number, m: number): number {
  const start = new Date(r.startDate);
  const end = r.endDate ? new Date(r.endDate) : null;
  if (!end) return 0;
  const afterStart = y > start.getFullYear() || (y === start.getFullYear() && m >= start.getMonth() + 1);
  const beforeEnd = y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth() + 1);
  if (!afterStart || !beforeEnd) return 0;
  const isLast = y === end.getFullYear() && m === end.getMonth() + 1;
  if (!isLast) return r.amount;
  const count = r.installmentCount ?? 1;
  const total = r.installmentTotalAmount ?? r.amount * count;
  const residual = Math.round((total - r.amount * (count - 1)) * 100) / 100;
  return residual > 0 ? residual : r.amount;
}

export interface PlanBreakdown {
  /** Faturadaki toplam tutar. */
  total: number;
  /** 2 haneye yuvarlanmış aylık taksit. */
  monthly: number;
  /** Küsurat farkıyla kapanan son taksit. */
  lastInstallment: number;
  /** Son taksit aylıktan farklı mı (küsurat var mı)? */
  hasResidual: boolean;
}

/**
 * Kullanıcı toplam YA DA aylık girer; diğeri hesaplanır. Aylık taksit her zaman
 * 2 haneye yuvarlanır; küsurat farkı son taksitte kapanır (backend ile aynı kural).
 */
export function computePlanBreakdown(
  entered: number,
  mode: 'total' | 'monthly',
  count: number,
): PlanBreakdown {
  const total = mode === 'total' ? entered : Math.round(entered * count * 100) / 100;
  const monthly = mode === 'total' ? Math.round((entered / count) * 100) / 100 : entered;
  const lastInstallment = Math.round((total - monthly * (count - 1)) * 100) / 100;
  const hasResidual = Number.isFinite(entered) && entered > 0 && Math.abs(lastInstallment - monthly) >= 0.01;
  return { total, monthly, lastInstallment, hasResidual };
}

/** common namespace'teki kısa ay anahtarları (0-indexed). */
export const MONTH_SHORT_KEYS = [
  'month_short_jan', 'month_short_feb', 'month_short_mar', 'month_short_apr',
  'month_short_may', 'month_short_jun', 'month_short_jul', 'month_short_aug',
  'month_short_sep', 'month_short_oct', 'month_short_nov', 'month_short_dec',
] as const;
