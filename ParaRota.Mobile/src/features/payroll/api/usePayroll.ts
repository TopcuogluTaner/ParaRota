import { useQuery } from '@tanstack/react-query';
import { payrollApi } from '@shared/api/endpoints/payroll';
import { unwrap } from '@shared/api/unwrap';

// Brüt→net hesabı: gross>0 olunca çalışır (sabit sonuç, uzun staleTime).
export function usePayrollQuery(gross: number, year: number) {
  return useQuery({
    queryKey: ['payroll', 'gross-to-net', gross, year],
    queryFn: () => unwrap(payrollApi.grossToNet(gross, year)),
    enabled: gross > 0,
    staleTime: 60 * 60 * 1000,
  });
}

// Kıdem & ihbar tahmini: işe giriş + brüt girilince çalışır (salt hesap, uzun staleTime).
export function useSeveranceQuery(hireDate: string | null, gross: number, vacationDays: number) {
  return useQuery({
    queryKey: ['payroll', 'severance', hireDate, gross, vacationDays],
    queryFn: () => unwrap(payrollApi.severance(hireDate!, gross, vacationDays)),
    enabled: !!hireDate && gross > 0,
    staleTime: 60 * 60 * 1000,
  });
}

// Desteklenen yıllar (parametresi tanımlı). Mobil, en güncel yılı (max) varsayılan alır.
export function usePayrollYearsQuery() {
  return useQuery({
    queryKey: ['payroll', 'years'],
    queryFn: () => unwrap(payrollApi.years()),
    staleTime: 24 * 60 * 60 * 1000,
  });
}
