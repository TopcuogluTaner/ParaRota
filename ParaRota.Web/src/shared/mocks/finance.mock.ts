// ────────────────────────────────────────────────────────────────────────────
// Mock data — used by feature pages until real backend endpoints exist.
// Numbers are realistic-Turkey (TRY). Replace with real API once Faz 1 lands.
// Names/labels translate reactively via i18n.on('languageChanged').
// ────────────────────────────────────────────────────────────────────────────
import i18n from '@shared/i18n';

const tm = (key: string) => i18n.t(key, { ns: 'mocks' });

export type TxType = 'income' | 'expense';
export type TxNature = 'fixed' | 'variable';
export type TxStatus = 'planned' | 'completed';

export interface CategoryMock {
  id: number;
  name: string;
  icon: string;
  color: string;
  type: TxType;
}

export interface BudgetMock {
  id: number;
  categoryId: number;
  category: CategoryMock;
  limit: number;
  spent: number;
  month: number;
  year: number;
  warnThreshold: number; // percent
}

// Goals artık backend API'den geliyor (Faz 2). GoalMock/GOALS export'ları
// kaldırıldı; tipleri @shared/api/types/goals.ts içinde.

export type DebtKind = 'creditCard' | 'personalLoan' | 'mortgage' | 'carLoan';

export interface DebtMock {
  id: number;
  name: string;
  lender: string;
  kind: DebtKind;
  total: number;
  remaining: number;
  interestRate: number; // monthly %
  minPayment: number;
  dueDay: number;
  isOverdue: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
const CATEGORY_KEYS: Record<number, string> = {
  1: 'cat_salary',
  2: 'cat_bonus',
  3: 'cat_freelance',
  4: 'cat_rentalIncome',
  10: 'cat_rent',
  11: 'cat_bills',
  12: 'cat_groceries',
  13: 'cat_transport',
  14: 'cat_dining',
  15: 'cat_entertainment',
  16: 'cat_health',
  17: 'cat_subscriptions',
  18: 'cat_debtPayment',
};

export const CATEGORIES: CategoryMock[] = [
  // Income
  { id: 1, name: tm('cat_salary'), icon: 'mdi:cash-multiple', color: '#0F8B6C', type: 'income' },
  { id: 2, name: tm('cat_bonus'), icon: 'mdi:gift-outline', color: '#1FB585', type: 'income' },
  { id: 3, name: tm('cat_freelance'), icon: 'mdi:laptop', color: '#1E5F8A', type: 'income' },
  { id: 4, name: tm('cat_rentalIncome'), icon: 'mdi:home-city-outline', color: '#3F87B4', type: 'income' },
  // Expense
  { id: 10, name: tm('cat_rent'), icon: 'mdi:home-outline', color: '#B0341E', type: 'expense' },
  { id: 11, name: tm('cat_bills'), icon: 'mdi:lightning-bolt-outline', color: '#B7651C', type: 'expense' },
  { id: 12, name: tm('cat_groceries'), icon: 'mdi:cart-outline', color: '#D58A36', type: 'expense' },
  { id: 13, name: tm('cat_transport'), icon: 'mdi:car-outline', color: '#1E5F8A', type: 'expense' },
  { id: 14, name: tm('cat_dining'), icon: 'mdi:silverware-fork-knife', color: '#D8543B', type: 'expense' },
  { id: 15, name: tm('cat_entertainment'), icon: 'mdi:movie-outline', color: '#9C5A9C', type: 'expense' },
  { id: 16, name: tm('cat_health'), icon: 'mdi:heart-pulse', color: '#0F8B6C', type: 'expense' },
  { id: 17, name: tm('cat_subscriptions'), icon: 'mdi:autorenew', color: '#7B6CA5', type: 'expense' },
  { id: 18, name: tm('cat_debtPayment'), icon: 'mdi:credit-card-outline', color: '#5A4A3D', type: 'expense' },
];

const cat = (id: number) => CATEGORIES.find((c) => c.id === id)!;

const today = new Date();

// TRANSACTIONS mock kaldırıldı — TransactionsPage + Dashboard widget'ları
// artık gerçek API'yi (/transactions ve /dashboard/summary) kullanıyor.

export const BUDGETS: BudgetMock[] = [
  { id: 1, categoryId: 12, category: cat(12), limit: 6000, spent: 2130, month: today.getMonth() + 1, year: today.getFullYear(), warnThreshold: 80 },
  { id: 2, categoryId: 14, category: cat(14), limit: 2500, spent: 1840, month: today.getMonth() + 1, year: today.getFullYear(), warnThreshold: 80 },
  { id: 3, categoryId: 13, category: cat(13), limit: 1500, spent: 1620, month: today.getMonth() + 1, year: today.getFullYear(), warnThreshold: 80 },
  { id: 4, categoryId: 15, category: cat(15), limit: 2000, spent: 560, month: today.getMonth() + 1, year: today.getFullYear(), warnThreshold: 80 },
  { id: 5, categoryId: 11, category: cat(11), limit: 3500, spent: 2630, month: today.getMonth() + 1, year: today.getFullYear(), warnThreshold: 80 },
  { id: 6, categoryId: 17, category: cat(17), limit: 400, spent: 298, month: today.getMonth() + 1, year: today.getFullYear(), warnThreshold: 80 },
];

const DEBT_NAME_KEYS: Record<number, string> = {
  1: 'debt_bonusCard',
  2: 'debt_personalLoan',
  3: 'debt_carLoan',
};

export const DEBTS: DebtMock[] = [
  { id: 1, name: tm('debt_bonusCard'), lender: 'Garanti BBVA', kind: 'creditCard', total: 28000, remaining: 18450, interestRate: 4.42, minPayment: 1850, dueDay: 22, isOverdue: false },
  { id: 2, name: tm('debt_personalLoan'), lender: 'İş Bankası', kind: 'personalLoan', total: 80000, remaining: 42300, interestRate: 3.85, minPayment: 5400, dueDay: 15, isOverdue: false },
  { id: 3, name: tm('debt_carLoan'), lender: 'Ziraat', kind: 'carLoan', total: 350000, remaining: 215000, interestRate: 2.95, minPayment: 8200, dueDay: 5, isOverdue: true },
];

// MONTHLY_SUMMARY / MONTHLY_TREND / EXPENSE_BY_CATEGORY mock'ları kaldırıldı —
// Dashboard widget'ları artık /dashboard/summary endpoint'ini kullanıyor.

// ────────────────────────────────────────────────────────────────────────────
export const DEBT_KIND_LABELS: Record<DebtKind, string> = {
  creditCard: tm('debtKind_creditCard'),
  personalLoan: tm('debtKind_personalLoan'),
  mortgage: tm('debtKind_mortgage'),
  carLoan: tm('debtKind_carLoan'),
};

export const DEBT_KIND_COLORS: Record<DebtKind, string> = {
  creditCard: '#B0341E',
  personalLoan: '#1E5F8A',
  mortgage: '#0F8B6C',
  carLoan: '#B7651C',
};

export const DEBT_KIND_ICONS: Record<DebtKind, string> = {
  creditCard: 'mdi:credit-card-outline',
  personalLoan: 'mdi:cash-100',
  mortgage: 'mdi:home-outline',
  carLoan: 'mdi:car-outline',
};

// ────────────────────────────────────────────────────────────────────────────
// Re-translate mock display strings in-place when the user switches language.
// React re-renders via useTranslation; consumers pick up the new strings.
// ────────────────────────────────────────────────────────────────────────────
function retranslateMocks() {
  CATEGORIES.forEach((c) => {
    const k = CATEGORY_KEYS[c.id];
    if (k) c.name = tm(k);
  });
  DEBTS.forEach((d) => {
    const k = DEBT_NAME_KEYS[d.id];
    if (k) d.name = tm(k);
  });
  DEBT_KIND_LABELS.creditCard = tm('debtKind_creditCard');
  DEBT_KIND_LABELS.personalLoan = tm('debtKind_personalLoan');
  DEBT_KIND_LABELS.mortgage = tm('debtKind_mortgage');
  DEBT_KIND_LABELS.carLoan = tm('debtKind_carLoan');
}

i18n.on('languageChanged', retranslateMocks);
