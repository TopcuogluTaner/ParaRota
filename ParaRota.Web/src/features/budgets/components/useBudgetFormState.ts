import { useEffect, useState } from 'react';
import { parseAmount } from '@shared/lib/parseAmount';
import type { BudgetDto } from '@shared/api/types';

export interface BudgetFormState {
  categoryId: number | null;
  monthlyLimit: string;
  month: number;
  year: number;
  warnThreshold: number;
}

function initialFormState(defaultMonth?: number, defaultYear?: number): BudgetFormState {
  const n = new Date();
  return {
    categoryId: null,
    monthlyLimit: '',
    month: defaultMonth ?? n.getMonth() + 1,
    year: defaultYear ?? n.getFullYear(),
    warnThreshold: 80,
  };
}

function fromBudget(b: BudgetDto): BudgetFormState {
  return {
    categoryId: b.categoryId,
    monthlyLimit: String(b.monthlyLimit),
    month: b.month,
    year: b.year,
    warnThreshold: b.warnThreshold,
  };
}

export interface BudgetFormStateApi {
  form: BudgetFormState;
  set: <K extends keyof BudgetFormState>(key: K, value: BudgetFormState[K]) => void;
  limitNum: number;
  categoryMissing: boolean;
  limitInvalid: boolean;
  canSubmit: boolean;
}

/**
 * BudgetFormModal form state + derived values.
 * Default month/year prop'u sadece create + open=true sırasında ve open
 * transitionunda devreye girer; edit mode budget.month/year'ı kullanır.
 */
export function useBudgetFormState(
  open: boolean,
  mode: 'create' | 'edit',
  budget: BudgetDto | undefined,
  isPending: boolean,
  defaultMonth?: number,
  defaultYear?: number,
): BudgetFormStateApi {
  const [form, setForm] = useState<BudgetFormState>(() => initialFormState(defaultMonth, defaultYear));

  useEffect(() => {
    if (!open) return;
    // budget referansı React Query refetch'te değişebilir; sadece id'ye bak.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(mode === 'edit' && budget ? fromBudget(budget) : initialFormState(defaultMonth, defaultYear));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, budget?.id, defaultMonth, defaultYear]);

  const set = <K extends keyof BudgetFormState>(key: K, value: BudgetFormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const limitNum = parseAmount(form.monthlyLimit);
  const categoryMissing = form.categoryId === null;
  const limitInvalid = Number.isNaN(limitNum) || limitNum <= 0;
  const canSubmit =
    !isPending &&
    !categoryMissing &&
    !limitInvalid &&
    form.warnThreshold >= 1 &&
    form.warnThreshold <= 100;

  return { form, set, limitNum, categoryMissing, limitInvalid, canSubmit };
}
