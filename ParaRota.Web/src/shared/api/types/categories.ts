import type { TxType } from './common';

export interface CategoryDto {
  id: number;
  name: string;
  icon: string;
  emoji?: string;
  color?: string;
  type: TxType;
  isSystem?: boolean;
  /** Aktif scope'taki bu kategoriye bağlı işlem sayısı (kullanım rozeti). */
  transactionCount: number;
}

export interface CategoryMergeRequest {
  targetCategoryId: number;
}

export interface CategoryCreateRequest {
  name: string;
  icon: string;
  emoji?: string;
  color?: string;
  type: TxType;
}

export interface CategoryUpdateRequest {
  name: string;
  icon: string;
  emoji?: string;
  color?: string;
}
