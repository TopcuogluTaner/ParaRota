/**
 * Faz 4 — Export endpoint request types.
 * Response binary stream (blob); ApiResponse sarmalı yok.
 */

export interface MonthlyPdfRequest {
  months: number[];          // 1-12, birden fazla seçilebilir
  year: number;
  includeTransactions: boolean;  // "En Büyük İşlemler" tablosu dahil mi
  layout: 'combined' | 'perMonth';  // çok aylı düzen
}

export interface TransactionsXlsxRequest {
  startDate: string;  // ISO YYYY-MM-DD
  endDate: string;    // ISO YYYY-MM-DD
  categoryIds?: number[];
  types?: ('income' | 'expense')[];
}
