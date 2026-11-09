/**
 * Faz 4 — Export endpoint request types.
 * Response binary stream (blob); ApiResponse sarmalı yok.
 */

export interface MonthlyPdfRequest {
  month: number;  // 1-12
  year: number;
}

export interface TransactionsXlsxRequest {
  startDate: string;  // ISO YYYY-MM-DD
  endDate: string;    // ISO YYYY-MM-DD
  categoryIds?: number[];
  types?: ('income' | 'expense')[];
}
