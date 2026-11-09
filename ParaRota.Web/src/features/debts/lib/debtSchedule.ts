import { dayjs } from '@shared/lib/dateFormat';
import type { DebtDto, DebtFrequency } from '@shared/api/types/debts';

export type InstallmentState = 'paid' | 'overdue' | 'upcoming';

export interface ScheduleInstallment {
  /** 1-based installment number */
  index: number;
  dueDate: string;
  amount: number;
  state: InstallmentState;
}

const FREQ_ADD: Record<DebtFrequency, { count: number; unit: dayjs.ManipulateType }> = {
  weekly: { count: 1, unit: 'week' },
  biweekly: { count: 2, unit: 'week' },
  monthly: { count: 1, unit: 'month' },
  yearly: { count: 1, unit: 'year' },
};

/**
 * Bir borcun taksit takvimini üretir. installmentCount yoksa null döner
 * (tek seferlik borç — çağıran taraf sade vade gösterimi yapar).
 *
 * Ödenmiş taksitleri payments[] toplamına göre kümülatif belirler: ödenen
 * toplam tutar, sıradaki taksitin tutarını karşıladıkça o taksit "paid"
 * sayılır. Kalan ödenmemiş taksitlerden vadesi bugünden önce olanlar
 * "overdue", diğerleri "upcoming".
 */
export function buildDebtSchedule(debt: DebtDto): ScheduleInstallment[] | null {
  const count = debt.installmentCount;
  if (!count || count < 1) return null;

  const freq = debt.installmentFrequency ?? 'monthly';
  const step = FREQ_ADD[freq];
  const start = dayjs(debt.startDate);
  const perInstallment = debt.amount / count;
  const today = dayjs().startOf('day');

  // Toplam ödenmiş tutar (paidAmount alanı varsa onu kullan, yoksa amount - remaining).
  const totalPaid =
    typeof debt.paidAmount === 'number'
      ? debt.paidAmount
      : Math.max(0, debt.amount - debt.remainingAmount);

  const result: ScheduleInstallment[] = [];
  let cumulative = 0;
  const EPS = 0.001;

  for (let i = 0; i < count; i += 1) {
    const dueDate = start.add(step.count * i, step.unit);
    cumulative += perInstallment;

    // Kümülatif olarak bu taksiti kapatacak kadar ödeme yapıldıysa "paid".
    const isPaid = totalPaid + EPS >= cumulative;

    let state: InstallmentState;
    if (isPaid) {
      state = 'paid';
    } else if (dueDate.startOf('day').isBefore(today)) {
      state = 'overdue';
    } else {
      state = 'upcoming';
    }

    result.push({
      index: i + 1,
      dueDate: dueDate.toISOString(),
      amount: perInstallment,
      state,
    });
  }

  return result;
}
