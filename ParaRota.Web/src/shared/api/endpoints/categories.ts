import { http, ACTIVE_HOUSEHOLD_HEADER } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type {
  CategoryDto,
  CategoryCreateRequest,
  CategoryUpdateRequest,
  CategoryMergeRequest,
} from '../types';

const BASE = '/categories';

export const categoryApi = {
  list: () => http.get<ApiResponse<CategoryDto[]>>(BASE),
  /** Aktif scope yerine belirli bir kapsamın kategorileri (null = kişisel). Taşıma modalı için. */
  listForScope: (householdId: number | null) =>
    http.get<ApiResponse<CategoryDto[]>>(BASE, {
      headers: { [ACTIVE_HOUSEHOLD_HEADER]: String(householdId ?? 0) },
    }),
  get: (id: number) => http.get<ApiResponse<CategoryDto>>(`${BASE}/${id}`),
  create: (body: CategoryCreateRequest) => http.post<ApiResponse<CategoryDto>>(BASE, body),
  update: (id: number, body: CategoryUpdateRequest) =>
    http.put<ApiResponse<CategoryDto>>(`${BASE}/${id}`, body),
  remove: (id: number) => http.delete<ApiResponse<unknown>>(`${BASE}/${id}`),
  merge: (id: number, body: CategoryMergeRequest) =>
    http.post<ApiResponse<unknown>>(`${BASE}/${id}/merge`, body),
};
