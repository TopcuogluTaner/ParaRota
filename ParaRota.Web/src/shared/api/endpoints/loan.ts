import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { LoanCostResultDto, LoanType } from '../types';

/**
 * Kredi gerçek maliyeti — faiz + KKDF + BSMV dahil taksit, toplam maliyet, gerçek yıllık oran.
 * Backend: GET /api/v1/loan-cost?amount=&monthlyRatePercent=&termMonths=&loanType=&dosyaMasrafi=
 */
export const loanApi = {
  calculate: (
    amount: number,
    monthlyRatePercent: number,
    termMonths: number,
    loanType: LoanType,
    dosyaMasrafi: number,
  ) =>
    http.get<ApiResponse<LoanCostResultDto>>('/loan-cost', {
      params: { amount, monthlyRatePercent, termMonths, loanType, dosyaMasrafi },
    }),
};
