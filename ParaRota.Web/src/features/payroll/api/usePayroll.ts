import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from '@shared/api/endpoints/payroll';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';
import type { PayrollRaiseRequest } from '@shared/api/types';

// Brüt→net hesabı: gross>0 olunca çalışır. Sonuç deterministik (resmi parametre
// tablosu) olduğu için uzun staleTime güvenli.
export function usePayrollQuery(gross: number, year: number) {
  return useQuery({
    queryKey: ['payroll', 'gross-to-net', gross, year],
    queryFn: () => unwrap(payrollApi.grossToNet(gross, year)),
    enabled: gross > 0,
    staleTime: 60 * 60 * 1000,
  });
}

// Desteklenen yıllar. En güncel yıl (max) varsayılan alınır.
export function usePayrollYearsQuery() {
  return useQuery({
    queryKey: ['payroll', 'years'],
    queryFn: () => unwrap(payrollApi.years()),
    staleTime: 24 * 60 * 60 * 1000,
  });
}

// Maaş otomatiğine zam: kuralın brütünü yürürlük tarihinden itibaren değiştirir.
// Kural (tutar/brüt) değiştiği için recurring cache'i, görünür tutarlar dashboard'a
// yansıyabileceği için dashboard cache'i tazelenir.
export function useApplyPayrollRaise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { ruleId: number } & PayrollRaiseRequest) =>
      unwrap(payrollApi.applyRaise(vars.ruleId, { gross: vars.gross, effectiveDate: vars.effectiveDate })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.recurringRules.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

// Kıdem & ihbar tahmini: işe giriş + brüt girilince çalışır (salt hesap).
export function useSeveranceQuery(hireDate: string | null, gross: number, vacationDays: number) {
  return useQuery({
    queryKey: ['payroll', 'severance', hireDate, gross, vacationDays],
    queryFn: () => unwrap(payrollApi.severance(hireDate!, gross, vacationDays)),
    enabled: !!hireDate && gross > 0,
    staleTime: 60 * 60 * 1000,
  });
}
