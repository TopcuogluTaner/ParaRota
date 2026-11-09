import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type {
  PortfolioDto,
  HoldingDto,
  CreateHoldingRequest,
  UpdateHoldingRequest,
  SellHoldingRequest,
  SellResultDto,
  AssetRateDto,
  TefasFundQuote,
} from '../types';

const BASE = '/investments';

export const investmentApi = {
  portfolio: () => http.get<ApiResponse<PortfolioDto>>(`${BASE}/portfolio`),
  rates: () => http.get<ApiResponse<AssetRateDto[]>>(`${BASE}/rates`),
  // TEFAS fon kodu doğrulama + güncel pay değeri/adı (ekleme/alarm formu).
  lookupTefas: (code: string) =>
    http.get<ApiResponse<TefasFundQuote>>(`${BASE}/tefas/lookup`, { params: { code } }),
  create: (body: CreateHoldingRequest) => http.post<ApiResponse<HoldingDto>>(`${BASE}/holdings`, body),
  update: (id: number, body: UpdateHoldingRequest) =>
    http.put<ApiResponse<HoldingDto>>(`${BASE}/holdings/${id}`, body),
  sell: (id: number, body: SellHoldingRequest) =>
    http.post<ApiResponse<SellResultDto>>(`${BASE}/holdings/${id}/sell`, body),
  remove: (id: number) => http.delete<ApiResponse<unknown>>(`${BASE}/holdings/${id}`),
};
