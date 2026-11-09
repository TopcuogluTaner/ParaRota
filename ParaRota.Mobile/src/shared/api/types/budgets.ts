import type { CategoryDto } from './categories';

export type BudgetAlertLevel = 'normal' | 'warning' | 'exceeded';

export interface BudgetDto {
  id: number;
  categoryId: number;
  category: CategoryDto;
  monthlyLimit: number;
  month: number;
  year: number;
  warnThreshold: number;

  // Backend tarafından hesaplanır.
  spent: number;
  remaining: number;
  usagePercentage: number;
  alertLevel: BudgetAlertLevel;

  // Aile scope'unda kişi kırılımı (kişisel scope'ta boş).
  memberBreakdown: BudgetMemberSpent[];
}

export interface BudgetMemberSpent {
  userId: number;
  name: string;
  amount: number;
}

export interface BudgetCreateRequest {
  categoryId: number;
  monthlyLimit: number;
  month: number;
  year: number;
  warnThreshold: number;
}

// categoryId, month, year değişmez — sadece limit + threshold güncellenir.
export interface BudgetUpdateRequest {
  monthlyLimit: number;
  warnThreshold: number;
}
