// Kredi gerçek maliyeti — backend LoanType enum'u ile birebir (case-insensitive bağlanır).
export type LoanType = 'Ihtiyac' | 'Konut' | 'Tasit';

export interface LoanScheduleRowDto {
  month: number;
  principal: number;
  interest: number;
  tax: number;
  balance: number;
}

export interface LoanCostResultDto {
  amount: number;
  monthlyRatePercent: number;
  termMonths: number;
  dosyaMasrafi: number;
  kkdfPercent: number;
  bsmvPercent: number;
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  totalTax: number;
  totalCost: number;
  monthlyCostRatePercent: number;
  annualCostRatePercent: number;
  nominalAnnualRatePercent: number;
  schedule: LoanScheduleRowDto[];
}
