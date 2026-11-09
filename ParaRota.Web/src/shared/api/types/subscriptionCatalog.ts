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

export interface SubscriptionCatalogItemCreateRequest {
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

// Key sabittir (seed idempotency) — güncellemede gönderilmez.
export type SubscriptionCatalogItemUpdateRequest = Omit<SubscriptionCatalogItemCreateRequest, 'key'>;
