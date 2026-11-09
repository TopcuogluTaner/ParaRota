import { http } from '../httpClient';
import type { ApiResponse, PagedResponse } from '@shared/types/apiResponse';
import type {
  TransactionDto,
  TransactionListParams,
  TransactionCreateRequest,
  TransactionUpdateRequest,
  MoveTransactionScopeRequest,
} from '../types';

const BASE = '/transactions';

function toQuery(params: TransactionListParams): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const q = search.toString();
  return q ? `?${q}` : '';
}

export const transactionApi = {
  list: (params: TransactionListParams = {}) =>
    http.get<ApiResponse<PagedResponse<TransactionDto>>>(`${BASE}${toQuery(params)}`),
  get: (id: number) => http.get<ApiResponse<TransactionDto>>(`${BASE}/${id}`),
  create: (body: TransactionCreateRequest) =>
    http.post<ApiResponse<TransactionDto>>(BASE, body),
  update: (id: number, body: TransactionUpdateRequest) =>
    http.put<ApiResponse<TransactionDto>>(`${BASE}/${id}`, body),
  remove: (id: number) => http.delete<ApiResponse<unknown>>(`${BASE}/${id}`),
  moveScope: (id: number, body: MoveTransactionScopeRequest) =>
    http.patch<ApiResponse<TransactionDto>>(`${BASE}/${id}/scope`, body),
};
