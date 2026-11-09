import type { BudgetDto } from './budgets';
import type { TransactionDto } from './transactions';

export interface MonthlyTrendPointDto {
  monthKey: string; // e.g. 'month_short_may' — resolved via i18n common namespace
  income: number;
  expense: number;
}

export interface CategoryShareDto {
  categoryId: number;
  name: string;
  color: string;
  amount: number;
  share: number;
}

export interface DashboardSummaryDto {
  month: number;
  year: number;
  income: number;
  expense: number;
  net: number;
  savingsRate: number; // 0..1
  monthlyTrend: MonthlyTrendPointDto[];
  topExpensesByCategory: CategoryShareDto[];
  upcomingPayments: TransactionDto[];
  recentTransactions: TransactionDto[];
  budgetStatuses: BudgetDto[];
}

// ── Kural bazlı içgörüler ────────────────────────────────────────────────────
// Bildirim sözleşmesiyle aynı model: backend key+params üretir, metin
// frontend'de i18n ile kurulur (insight_<key> anahtarları).

export type InsightSeverity = 'info' | 'warning' | 'success';

export interface InsightDto {
  key: 'categorySpike' | 'budgetPace' | 'savingsRate' | 'overspend' | 'upcomingWeek' | (string & {});
  severity: InsightSeverity;
  params: Record<string, string | number | null>;
}

// ── Nakit akışı tahmini ──────────────────────────────────────────────────────

export interface CashflowItemDto {
  date: string;
  ruleId: number;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
}

export interface CashflowForecastDto {
  monthStart: string;
  monthEnd: string;
  actualIncome: number;
  actualExpense: number;
  actualNet: number;
  plannedIncome: number;
  plannedExpense: number;
  projectedNet: number;
  items: CashflowItemDto[];
}
