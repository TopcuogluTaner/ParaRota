import { useEffect, useState } from 'react';
import { parseAmount } from '@shared/lib/parseAmount';
import type { DebtDto, DebtFrequency, DebtKind, PaymentMode } from '@shared/api/types/debts';

export interface DebtFormState {
  title: string;
  description: string;
  kind: DebtKind;
  amount: string;
  currency: string;
  counterpartyName: string;
  interestRate: string;
  startDate: string;
  dueDate: string;
  installmentCount: string;
  installmentFrequency: DebtFrequency;
  paymentMode: PaymentMode;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY: DebtFormState = {
  title: '',
  description: '',
  kind: 'payable',
  amount: '',
  currency: 'TRY',
  counterpartyName: '',
  interestRate: '',
  startDate: todayIso(),
  dueDate: '',
  installmentCount: '',
  installmentFrequency: 'monthly',
  paymentMode: 'manual',
};

function fromDebt(debt: DebtDto): DebtFormState {
  return {
    title: debt.title,
    description: debt.description ?? '',
    kind: debt.kind,
    amount: debt.amount.toString(),
    currency: debt.currency,
    counterpartyName: debt.counterpartyName,
    interestRate: debt.interestRate?.toString() ?? '',
    startDate: debt.startDate.slice(0, 10),
    dueDate: debt.dueDate?.slice(0, 10) ?? '',
    installmentCount: debt.installmentCount?.toString() ?? '',
    installmentFrequency: debt.installmentFrequency ?? 'monthly',
    paymentMode: debt.paymentMode,
  };
}

export interface DebtFormStateApi {
  form: DebtFormState;
  set: <K extends keyof DebtFormState>(key: K, value: DebtFormState[K]) => void;
  amountNum: number;
  interestNum: number | undefined;
  installmentNum: number | undefined;
  canSubmit: boolean;
  /** İlk başarısız "Kaydet" denemesinden sonra eksik alanları kırmızı göster. */
  attempted: boolean;
  setAttempted: (v: boolean) => void;
  titleMissing: boolean;
  counterpartyMissing: boolean;
  amountInvalid: boolean;
}

/**
 * DebtFormModal'ın form state + derived value'larını tek yerde tutar.
 * `open` değişince modal her açılışta form'u sıfırlar/doldurur (mode+debt'e göre).
 * Modal kapalıyken state korunmaz; pending durumu modal tarafında yönetilir.
 */
export function useDebtFormState(
  open: boolean,
  mode: 'create' | 'edit',
  debt: DebtDto | null | undefined,
): DebtFormStateApi {
  const [form, setForm] = useState<DebtFormState>(EMPTY);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(mode === 'edit' && debt ? fromDebt(debt) : EMPTY);
    setAttempted(false);
  }, [open, mode, debt]);

  const set = <K extends keyof DebtFormState>(key: K, value: DebtFormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const amountNum = parseAmount(form.amount);
  const interestNum = form.interestRate ? parseFloat(form.interestRate) : undefined;
  const installmentNum = form.installmentCount ? parseInt(form.installmentCount, 10) : undefined;

  const titleMissing = form.title.trim().length === 0;
  const counterpartyMissing = form.counterpartyName.trim().length === 0;
  const amountInvalid = Number.isNaN(amountNum) || amountNum <= 0;
  // Canonical pattern: buton geçersizlikte DISABLE EDİLMEZ; geçerlilik handleSubmit'te okunur.
  const canSubmit = !titleMissing && !counterpartyMissing && !amountInvalid;

  return {
    form,
    set,
    amountNum,
    interestNum,
    installmentNum,
    canSubmit,
    attempted,
    setAttempted,
    titleMissing,
    counterpartyMissing,
    amountInvalid,
  };
}
