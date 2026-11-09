import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { SubscriptionCatalogDto } from '../types';

export const subscriptionCatalogApi = {
  get: () => http.get<ApiResponse<SubscriptionCatalogDto>>('/subscription-catalog'),
};
