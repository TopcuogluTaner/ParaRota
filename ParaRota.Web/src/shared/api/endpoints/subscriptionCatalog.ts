import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type {
  SubscriptionCatalogDto,
  SubscriptionCatalogItemDto,
  SubscriptionCatalogItemCreateRequest,
  SubscriptionCatalogItemUpdateRequest,
} from '../types';

const BASE = '/subscription-catalog';

export const subscriptionCatalogApi = {
  get: () => http.get<ApiResponse<SubscriptionCatalogDto>>(BASE),
  adminList: () => http.get<ApiResponse<SubscriptionCatalogItemDto[]>>(`${BASE}/admin`),
  adminCreate: (body: SubscriptionCatalogItemCreateRequest) =>
    http.post<ApiResponse<SubscriptionCatalogItemDto>>(`${BASE}/admin`, body),
  adminUpdate: (id: number, body: SubscriptionCatalogItemUpdateRequest) =>
    http.put<ApiResponse<SubscriptionCatalogItemDto>>(`${BASE}/admin/${id}`, body),
  adminRemove: (id: number) => http.delete<ApiResponse<unknown>>(`${BASE}/admin/${id}`),
};
