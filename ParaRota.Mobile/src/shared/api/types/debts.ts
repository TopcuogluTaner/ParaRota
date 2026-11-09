export type DebtKind = 'payable' | 'receivable';
export type DebtStatus = 'active' | 'completed' | 'cancelled';
export type PaymentMode = 'auto' | 'manual';
export type DebtFrequency = 'monthly' | 'weekly' | 'biweekly' | 'yearly';

export interface DebtPaymentDto {
  id: number;
  amount: number;
  paymentDate: string;
  notes?: string;
  transactionId?: number | null;
  createdDate: string;
}

export interface DebtDto {
  id: number;
  userId: number;
  householdId?: number | null;
  title: string;
  description?: string;
  kind: DebtKind;
  amount: number;
  remainingAmount: number;
  paidAmount: number;
  currency: string;
  counterpartyName: string;
  interestRate?: number;
  startDate: string;
  dueDate?: string;
  installmentCount?: number;
  installmentFrequency?: DebtFrequency;
  paymentMode: PaymentMode;
  linkedRecurringRuleId?: number | null;
  status: DebtStatus;
  nextDueDate?: string;
  paymentsCount: number;
  lastPaymentDate?: string;
  createdDate: string;
}

export interface DebtListItemDto {
  id: number;
  householdId?: number | null;
  title: string;
  kind: DebtKind;
  counterpartyName: string;
  amount: number;
  remainingAmount: number;
  currency: string;
  status: DebtStatus;
  nextDueDate?: string;
  dueDate?: string;
}

export interface CreateDebtRequest {
  title: string;
  description?: string;
  kind: DebtKind;
  amount: number;
  currency: string;
  counterpartyName: string;
  interestRate?: number;
  startDate: string;
  dueDate?: string;
  installmentCount?: number;
  installmentFrequency?: DebtFrequency;
  paymentMode: PaymentMode;
  householdId?: number | null;
}

export interface UpdateDebtRequest {
  title: string;
  description?: string;
  counterpartyName: string;
  interestRate?: number;
  dueDate?: string;
  status: DebtStatus;
}

export interface AddDebtPaymentRequest {
  amount: number;
  paymentDate: string;
  notes?: string;
  createLinkedTransaction: boolean;
}
