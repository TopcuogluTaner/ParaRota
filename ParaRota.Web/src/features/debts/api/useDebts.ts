import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { debtApi } from '@shared/api/endpoints/debts';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';
import type {
  AddDebtPaymentRequest,
  CreateDebtRequest,
  DebtStatus,
  UpdateDebtRequest,
} from '@shared/api/types/debts';

export function useDebtsQuery(status?: DebtStatus) {
  return useQuery({
    queryKey: queryKeys.debts.list(status),
    queryFn: () => unwrap(debtApi.list(status)),
  });
}

export function useDebtQuery(id: number | null) {
  return useQuery({
    queryKey: queryKeys.debts.detail(id ?? 0),
    queryFn: () => unwrap(debtApi.get(id!)),
    enabled: id !== null && id > 0,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.debts.all });
  void qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
  void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
}

export function useCreateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDebtRequest) => unwrap(debtApi.create(body)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: UpdateDebtRequest }) =>
      unwrap(debtApi.update(vars.id, vars.body)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(debtApi.remove(id)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useAddDebtPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: AddDebtPaymentRequest }) =>
      unwrap(debtApi.addPayment(vars.id, vars.body)),
    onSuccess: () => invalidateAll(qc),
  });
}
