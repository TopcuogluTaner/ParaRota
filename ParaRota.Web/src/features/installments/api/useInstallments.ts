import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recurringRuleApi } from '@shared/api/endpoints/recurringRules';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';
import type {
  RecurringRuleCreateRequest,
  RecurringRuleUpdateRequest,
  RecurringRuleDto,
} from '@shared/api/types';

// ────────────────────────────────────────────────────────────────────────────
// Taksit planı = installmentCount dolu RecurringRule. Aynı endpoint + aynı
// query key kullanılır; böylece Tekrarlayanlar sayfasıyla cache paylaşılır,
// iki sayfadan biri mutasyon yapınca diğeri de tazelenir.
// ────────────────────────────────────────────────────────────────────────────

const selectInstallmentPlans = (rules: RecurringRuleDto[]) =>
  rules.filter((r) => r.installmentCount != null);

export function useInstallmentPlansQuery() {
  return useQuery({
    queryKey: queryKeys.recurringRules.list(),
    queryFn: () => unwrap(recurringRuleApi.list()),
    select: selectInstallmentPlans,
  });
}

function invalidateRules(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.recurringRules.all });
}

function invalidateRulesAndLedger(qc: ReturnType<typeof useQueryClient>) {
  // Geçmiş başlangıçlı plan oluşturulunca backend taksitleri ANINDA backfill eder
  // → işlem/bütçe/dashboard cache'leri de tazelenmeli.
  invalidateRules(qc);
  void qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
  void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
  void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
}

export function useCreateInstallmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecurringRuleCreateRequest) => unwrap(recurringRuleApi.create(body)),
    onSuccess: () => invalidateRulesAndLedger(qc),
  });
}

export function useUpdateInstallmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: RecurringRuleUpdateRequest }) =>
      unwrap(recurringRuleApi.update(vars.id, vars.body)),
    onSuccess: () => invalidateRules(qc),
  });
}

export function useDeleteInstallmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(recurringRuleApi.remove(id)),
    onSuccess: () => invalidateRules(qc),
  });
}
