import type { TxType } from './common';

// "dün akşam 450 lira yemek" → form ön doldurma önerisi (kayıt kullanıcı onayıyla oluşur).
export interface ParsedTransactionDto {
  amount: number;
  currency: string;
  type: TxType;
  categoryId?: number;
  categoryName?: string;
  transactionDate: string;
  description?: string;
}

export type InsightTone = 'positive' | 'warning' | 'neutral';

export interface InsightItemDto {
  text: string;
  tone: InsightTone;
}

// Rakamlar sunucuda hesaplanır; Gemini yalnız yorumlar (halüsinasyon koruması).
export interface MonthlyInsightsDto {
  month: number;
  year: number;
  items: InsightItemDto[];
}
