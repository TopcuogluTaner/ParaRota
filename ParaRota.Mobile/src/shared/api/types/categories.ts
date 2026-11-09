import type { TxType } from './common';

export interface CategoryDto {
  id: number;
  name: string;
  icon: string;
  emoji?: string;
  color?: string;
  type: TxType;
  isSystem?: boolean;
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
