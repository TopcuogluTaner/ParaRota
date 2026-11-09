import { useEffect, useState } from 'react';
import { parseAmount } from '@shared/lib/parseAmount';
import { computePlanBreakdown } from '../lib/installmentMath';
import type { RecurringRuleDto } from '@shared/api/types';

export type AmountMode = 'total' | 'monthly';

export interface InstallmentFormState {
  description: string;
  amountMode: AmountMode;
  amount: string;
  /** Seçili taksit sayısı (chip veya serbest girişten). */
  count: number;
  /** "Diğer" serbest girişi; doluysa chip seçimi yerine bu geçerlidir. */
  countInput: string;
  categoryId: number | null;
  firstDate: string; // YYYY-MM-DD
  notes: string;
}

function todayIsoDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EMPTY: InstallmentFormState = {
  description: '',
  amountMode: 'total',
  amount: '',
  count: 6,
  countInput: '',
  categoryId: null,
  firstDate: todayIsoDate(),
  notes: '',
};

function fromRule(rule: RecurringRuleDto): InstallmentFormState {
  return {
    description: rule.description,
    amountMode: 'total',
    amount: String(rule.installmentTotalAmount ?? rule.amount),
    count: rule.installmentCount ?? 2,
    countInput: '',
    categoryId: rule.categoryId,
    firstDate: rule.startDate.split('T')[0],
    notes: rule.notes ?? '',
  };
}

export interface InstallmentFormStateApi {
  form: InstallmentFormState;
  set: <K extends keyof InstallmentFormState>(key: K, value: InstallmentFormState[K]) => void;
  /** Geçerli taksit sayısı: "Diğer" girişi doluysa o, değilse chip seçimi. */
  count: number;
  /** Girilen tutar (toplam VEYA aylık — moda göre). */
  entered: number;
  amountValid: boolean;
  total: number;
  monthly: number;
  lastInstallment: number;
  hasResidual: boolean;
  canSubmit: boolean;
  /** İlk başarısız "Kaydet" denemesinden sonra eksik alanları kırmızı göster. */
  attempted: boolean;
  setAttempted: (v: boolean) => void;
  descriptionMissing: boolean;
  categoryMissing: boolean;
  countInvalid: boolean;
}

/**
 * InstallmentFormModal'ın form state + canlı önizleme türetmeleri.
 * Edit modunda plan çekirdeği (tutar/sayı/başlangıç) kilitlidir — yalnız
 * açıklama/kategori/not düzenlenir; kilitli alanlar submit'te entity'den
 * aynen geri gönderilir (backend INSTALLMENT_RULE_LOCKED guard'ı).
 */
export function useInstallmentFormState(
  open: boolean,
  rule: RecurringRuleDto | null | undefined,
): InstallmentFormStateApi {
  const [form, setForm] = useState<InstallmentFormState>(EMPTY);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(rule ? fromRule(rule) : { ...EMPTY, firstDate: todayIsoDate() });
    setAttempted(false);
  }, [open, rule]);

  const set = <K extends keyof InstallmentFormState>(key: K, value: InstallmentFormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const entered = parseAmount(form.amount);
  const amountValid = Number.isFinite(entered) && entered > 0;
  // "Diğer" girişi doluysa SAYI ODUR — aralık dışıysa eski chip değerine sessizce
  // düşmek yerine countInvalid üzerinden submit engellenir (stale-count bug fix'i).
  const count = form.countInput !== '' ? Number(form.countInput) : form.count;
  const countInvalid = !Number.isInteger(count) || count < 2 || count > 120;
  // Önizleme geçersiz sayıda Infinity/NaN üretmesin diye 2–120'ye kıstırılır;
  // submit yine countInvalid ile engellenir.
  const previewCount = countInvalid ? Math.min(120, Math.max(2, Math.round(count) || 2)) : count;
  const { total, monthly, lastInstallment, hasResidual } = computePlanBreakdown(
    amountValid ? entered : 0,
    form.amountMode,
    previewCount,
  );

  const descriptionMissing = form.description.trim().length === 0;
  const categoryMissing = form.categoryId == null;
  // Canonical pattern: buton geçersizlikte DISABLE EDİLMEZ; geçerlilik handleSubmit'te okunur.
  const canSubmit = !descriptionMissing && !categoryMissing && amountValid && !countInvalid;

  return {
    form,
    set,
    count,
    entered,
    amountValid,
    total,
    monthly,
    lastInstallment,
    hasResidual,
    canSubmit,
    attempted,
    setAttempted,
    descriptionMissing,
    categoryMissing,
    countInvalid,
  };
}
