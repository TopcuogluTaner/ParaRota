// ────────────────────────────────────────────────────────────────────────────
// Cross-domain enums — kept in sync with ParaRota.Domain.Enums.
// ────────────────────────────────────────────────────────────────────────────

export type TxType = 'income' | 'expense';
export type TxNature = 'fixed' | 'variable';
export type TxStatus = 'planned' | 'completed';
export type TxSource = 'manual' | 'recurring' | 'imported';
export type PaidVia = 'cash' | 'debitCard' | 'creditCard' | 'transfer' | 'eft';

export type GoalStatus = 'active' | 'completed' | 'paused';
export type Priority = 'low' | 'medium' | 'high';
