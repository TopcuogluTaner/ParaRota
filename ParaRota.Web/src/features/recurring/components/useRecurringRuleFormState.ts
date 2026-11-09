import { useEffect, useState } from 'react';
import { parseAmount } from '@shared/lib/parseAmount';
import type { RecurringFrequency, RecurringRuleDto, TxType } from '@shared/api/types';

export interface RecurringRuleFormState {
  description: string;
  type: TxType;
  categoryId: number | null;
  amount: string;
  currency: string;
  frequency: RecurringFrequency;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD or empty
  autoApprove: boolean;
  isActive: boolean;
  notes: string;
}

function todayIsoDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isoDate(input?: string) {
  if (!input) return '';
  // backend returns 'YYYY-MM-DDTHH:mm:ss' → trim to date
  return input.split('T')[0];
}

const EMPTY: RecurringRuleFormState = {
  description: '',
  type: 'expense',
  categoryId: null,
  amount: '',
  currency: 'TRY',
  frequency: 'monthly',
  startDate: todayIsoDate(),
  endDate: '',
  autoApprove: true,
  isActive: true,
  notes: '',
};

function fromRule(rule: RecurringRuleDto): RecurringRuleFormState {
  return {
    description: rule.description,
    type: rule.type,
    categoryId: rule.categoryId,
    amount: String(rule.amount),
    currency: rule.currency,
    frequency: rule.frequency,
    startDate: isoDate(rule.startDate) || todayIsoDate(),
    endDate: isoDate(rule.endDate),
    autoApprove: rule.autoApprove,
    isActive: rule.isActive,
    notes: rule.notes ?? '',
  };
}

export interface RecurringRuleFormStateApi {
  form: RecurringRuleFormState;
  set: <K extends keyof RecurringRuleFormState>(key: K, value: RecurringRuleFormState[K]) => void;
  onTypeChange: (next: TxType) => void;
  amountNum: number;
  canSubmit: boolean;
  /** İlk başarısız "Kaydet" denemesinden sonra eksik alanları kırmızı göster. */
  attempted: boolean;
  setAttempted: (v: boolean) => void;
  /** Alan bazlı geçersizlik bayrakları — canonical feedback için. */
  descriptionMissing: boolean;
  categoryMissing: boolean;
  amountInvalid: boolean;
}

/**
 * RecurringRuleFormModal form state'i + derived values.
 * Modal her açılışta mode+rule.id'ye göre form'u sıfırlar/doldurur.
 * Type değişince categoryId null'lanır (eski category yeni type'a uygun olmayabilir).
 * `preset` yalnız create modunda uygulanır (abonelik kataloğu ön doldurması).
 */
export function useRecurringRuleFormState(
  open: boolean,
  mode: 'create' | 'edit',
  rule: RecurringRuleDto | undefined,
  preset?: Partial<RecurringRuleFormState> | null,
): RecurringRuleFormStateApi {
  const [form, setForm] = useState<RecurringRuleFormState>(EMPTY);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    // rule referansı React Query refetch'te değişebilir; sadece id'ye bak.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(
      mode === 'edit' && rule
        ? fromRule(rule)
        : preset
          ? { ...EMPTY, startDate: todayIsoDate(), ...preset }
          : { ...EMPTY, startDate: todayIsoDate() },
    );
    setAttempted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, rule?.id, preset]);

  const set = <K extends keyof RecurringRuleFormState>(key: K, value: RecurringRuleFormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const onTypeChange = (next: TxType) => setForm((p) => ({ ...p, type: next, categoryId: null }));

  const amountNum = parseAmount(form.amount);
  const descriptionMissing = form.description.trim().length === 0;
  const categoryMissing = form.categoryId === null;
  const amountInvalid = Number.isNaN(amountNum) || amountNum <= 0;
  // Canonical pattern: buton geçersizlikte DISABLE EDİLMEZ (sadece submit sırasında).
  // Form geçerliliği handleSubmit içinde okunur.
  const canSubmit =
    !descriptionMissing &&
    !categoryMissing &&
    !amountInvalid &&
    form.startDate.length > 0 &&
    (form.endDate.length === 0 || form.endDate > form.startDate);

  return {
    form,
    set,
    onTypeChange,
    amountNum,
    canSubmit,
    attempted,
    setAttempted,
    descriptionMissing,
    categoryMissing,
    amountInvalid,
  };
}
