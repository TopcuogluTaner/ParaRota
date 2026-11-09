import type { PaidVia, TxNature, TxSource, TxStatus, TxType } from './common';
import type { CategoryDto } from './categories';

export interface TransactionDto {
  id: number;
  /** Kaydı oluşturan kullanıcı — sahiplik kontrolü (yalnız sahibi düzenler/taşır). */
  userId: number;
  categoryId: number;
  category: CategoryDto;
  type: TxType;
  nature: TxNature;
  status: TxStatus;
  source: TxSource;
  amount: number;
  currency: string;
  paidVia?: PaidVia;
  transactionDate: string; // ISO 8601
  notes?: string;
  receiptUrl?: string;
  recurringRuleId?: number;
  /** Household scope: null = kişisel kayıt, sayı = aile kaydı. */
  householdId?: number | null;
  /** Household ortamında "kim ekledi" — backend Include(User) ile doldurur. */
  createdByName?: string;
}

export interface TransactionListParams {
  type?: TxType;
  nature?: TxNature;
  status?: TxStatus;
  categoryId?: number;
  month?: number;
  year?: number;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface TransactionCreateRequest {
  categoryId: number;
  type: TxType;
  nature: TxNature;
  status: TxStatus;
  amount: number;
  currency: string;
  paidVia?: PaidVia;
  transactionDate: string;
  notes?: string;
  receiptUrl?: string;
}

// Type değişmez — Update'te Type alanı yok.
export interface TransactionUpdateRequest {
  categoryId: number;
  nature: TxNature;
  status: TxStatus;
  amount: number;
  currency: string;
  paidVia?: PaidVia;
  transactionDate: string;
  notes?: string;
  receiptUrl?: string;
}

// Kaydı kişisel ↔ aile kapsamı arasında taşır. Yalnız sahibi.
export interface MoveTransactionScopeRequest {
  /** Hedef kapsam: null = kişisel, sayı = aile id'si. */
  targetHouseholdId: number | null;
  /** Hedef kapsamda geçerli kategori (kişisel kategori ailede geçersiz olabilir). */
  categoryId: number;
}
