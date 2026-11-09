import type { RecurringFrequency } from './recurringRules';

export interface SubscriptionCatalogItemDto {
  id: number;
  key: string;
  name: string;
  icon: string;
  color: string;
  suggestedAmount: number;
  currency: string;
  frequency: RecurringFrequency;
  sortOrder: number;
  isActive: boolean;
}

// categoryId = sistem "Abonelikler" kategorisi (server-side çözülür).
export interface SubscriptionCatalogDto {
  categoryId: number;
  items: SubscriptionCatalogItemDto[];
}
