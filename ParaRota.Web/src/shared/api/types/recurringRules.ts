import type { TxNature, TxType } from './common';
import type { CategoryDto } from './categories';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringRuleDto {
  id: number;
  description: string;
  type: TxType;
  nature: TxNature;
  categoryId: number;
  category: CategoryDto;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  autoApprove: boolean;
  isActive: boolean;
  notes?: string;
  // Doluysa bu kural bir "maaş otomatiği"dir: tutar her ay resmi netten hesaplanır.
  payrollGrossMonthly?: number;
  // Doluysa kural bir kredi kartı taksit planıdır (aylık, gider).
  installmentCount?: number;
  installmentTotalAmount?: number;
  // Şimdiye kadar üretilen taksit sayısı (yalnız taksit planlarında dolu gelir).
  paidInstallments: number;
}

export interface RecurringRuleCreateRequest {
  description: string;
  type: TxType;
  nature: TxNature;
  categoryId: number;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  autoApprove: boolean;
  notes?: string;
  // Doluysa "maaş otomatiği": her ay ilgili ayın resmi netini üretir.
  payrollGrossMonthly?: number;
  // Taksit planı: aylık+gider zorunlu, endDate gönderilmez (server hesaplar).
  installmentCount?: number;
  installmentTotalAmount?: number;
}

// Type değişmez (Transaction kuralındaki gibi).
export interface RecurringRuleUpdateRequest {
  description: string;
  nature: TxNature;
  categoryId: number;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  autoApprove: boolean;
  isActive: boolean;
  notes?: string;
}

// ── Abonelik Radarı ─────────────────────────────────────────────────────────

export interface SubscriptionPriceChangeDto {
  previousAmount: number;
  currentAmount: number;
  percent: number;
  changedAt: string;
}

export interface SubscriptionRadarItemDto {
  ruleId: number;
  description: string;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  isActive: boolean;
  nextRunDate: string;
  priceChange?: SubscriptionPriceChangeDto | null;
}

// Aylığa normalize toplam — para birimi bazında (kur dönüşümü yapılmaz).
export interface SubscriptionRadarTotalDto {
  currency: string;
  monthlyTotal: number;
  yearlyTotal: number;
}

export interface SubscriptionRadarDto {
  totals: SubscriptionRadarTotalDto[];
  activeCount: number;
  pausedCount: number;
  items: SubscriptionRadarItemDto[];
}
