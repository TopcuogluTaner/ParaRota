// ────────────────────────────────────────────────────────────────────────────
// Centralized query keys for safe cache invalidation.
// Always reference these constants instead of building keys ad-hoc.
// ────────────────────────────────────────────────────────────────────────────

import type { TransactionListParams } from './types';

export const queryKeys = {
  categories: {
    all: ['categories'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.categories.all, 'detail', id] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (params: TransactionListParams = {}) =>
      [...queryKeys.transactions.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.transactions.all, 'detail', id] as const,
  },
  budgets: {
    all: ['budgets'] as const,
    list: (month?: number, year?: number) =>
      [...queryKeys.budgets.all, 'list', { month, year }] as const,
    detail: (id: number) => [...queryKeys.budgets.all, 'detail', id] as const,
  },
  recurringRules: {
    all: ['recurring-rules'] as const,
    list: (isActive?: boolean) =>
      [...queryKeys.recurringRules.all, 'list', { isActive }] as const,
    detail: (id: number) => [...queryKeys.recurringRules.all, 'detail', id] as const,
    radar: () => [...queryKeys.recurringRules.all, 'subscription-radar'] as const,
  },
  goals: {
    all: ['goals'] as const,
    list: () => [...queryKeys.goals.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.goals.all, 'detail', id] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    insights: () => [...queryKeys.dashboard.all, 'insights'] as const,
    cashflow: () => [...queryKeys.dashboard.all, 'cashflow'] as const,
    summary: (month?: number, year?: number) =>
      [...queryKeys.dashboard.all, 'summary', { month, year }] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (take?: number) => [...queryKeys.notifications.all, 'list', { take }] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
  },
  households: {
    all: ['households'] as const,
    mine: () => [...queryKeys.households.all, 'mine'] as const,
    memberships: () => [...queryKeys.households.all, 'memberships'] as const,
    detail: (id: number) => [...queryKeys.households.all, 'detail', id] as const,
    members: (id: number) => [...queryKeys.households.all, 'members', id] as const,
    invites: (id: number) => [...queryKeys.households.all, 'invites', id] as const,
  },
  debts: {
    all: ['debts'] as const,
    list: (status?: string) => [...queryKeys.debts.all, 'list', status ?? 'all'] as const,
    detail: (id: number) => [...queryKeys.debts.all, 'detail', id] as const,
  },
  goldDays: {
    all: ['gold-days'] as const,
    list: (status?: string) => [...queryKeys.goldDays.all, 'list', status ?? 'all'] as const,
    detail: (id: number) => [...queryKeys.goldDays.all, 'detail', id] as const,
  },
  investments: {
    all: ['investments'] as const,
    list: () => [...queryKeys.investments.all, 'list'] as const,
    rates: () => [...queryKeys.investments.all, 'rates'] as const,
  },
  priceAlarms: {
    all: ['price-alarms'] as const,
    list: (status?: string) => [...queryKeys.priceAlarms.all, 'list', status ?? 'all'] as const,
  },
  sharedPots: {
    all: ['shared-pots'] as const,
    list: (status?: string) => [...queryKeys.sharedPots.all, 'list', status ?? 'all'] as const,
    detail: (id: number) => [...queryKeys.sharedPots.all, 'detail', id] as const,
    candidates: () => [...queryKeys.sharedPots.all, 'candidates'] as const,
  },
  subscriptionCatalog: {
    all: ['subscription-catalog'] as const,
    adminList: () => [...queryKeys.subscriptionCatalog.all, 'admin'] as const,
  },
  severanceCeilings: {
    all: ['severance-ceilings'] as const,
    adminList: () => [...queryKeys.severanceCeilings.all, 'admin'] as const,
  },
  systemLogs: {
    all: ['system-logs'] as const,
    list: (page: number, search: string, minStatus: number) =>
      [...queryKeys.systemLogs.all, page, search, minStatus] as const,
  },
  systemStatus: {
    all: ['system-status'] as const,
  },
} as const;
