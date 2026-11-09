import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type {
  AddDebtPaymentRequest,
  CreateDebtRequest,
  DebtDto,
  DebtListItemDto,
  DebtStatus,
  UpdateDebtRequest,
} from '../types/debts';

const BASE = '/debts';

export const debtApi = {
  list: (status?: DebtStatus) =>
    http.get<ApiResponse<DebtListItemDto[]>>(BASE, {
      params: status ? { status } : undefined,
    }),
  get: (id: number) => http.get<ApiResponse<DebtDto>>(`${BASE}/${id}`),
  create: (body: CreateDebtRequest) => http.post<ApiResponse<DebtDto>>(BASE, body),
  update: (id: number, body: UpdateDebtRequest) =>
    http.put<ApiResponse<DebtDto>>(`${BASE}/${id}`, body),
  remove: (id: number) => http.delete<ApiResponse<string>>(`${BASE}/${id}`),
  addPayment: (id: number, body: AddDebtPaymentRequest) =>
    http.post<ApiResponse<DebtDto>>(`${BASE}/${id}/payments`, body),
};
