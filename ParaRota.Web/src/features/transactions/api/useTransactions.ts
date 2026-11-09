import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transactionApi } from '@shared/api/endpoints/transactions';
import { unwrap } from '@shared/api/unwrap';
import { queryKeys } from '@shared/api/queryKeys';
import type {
  TransactionCreateRequest,
  TransactionListParams,
  TransactionUpdateRequest,
  MoveTransactionScopeRequest,
} from '@shared/api/types';

export function useTransactionsQuery(params: TransactionListParams = {}) {
  return useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: () => unwrap(transactionApi.list(params)),
    placeholderData: (prev) => prev,
  });
}

export function useTransactionQuery(id: number) {
  return useQuery({
    queryKey: queryKeys.transactions.detail(id),
    queryFn: () => unwrap(transactionApi.get(id)),
    enabled: Number.isFinite(id) && id > 0,
  });
}

function invalidateTxAndDashboard(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
  void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TransactionCreateRequest) => unwrap(transactionApi.create(body)),
    onSuccess: () => invalidateTxAndDashboard(qc),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: TransactionUpdateRequest }) =>
      unwrap(transactionApi.update(vars.id, vars.body)),
    onSuccess: () => invalidateTxAndDashboard(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(transactionApi.remove(id)),
    onSuccess: () => invalidateTxAndDashboard(qc),
  });
}

export function useMoveTransactionScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: MoveTransactionScopeRequest }) =>
      unwrap(transactionApi.moveScope(vars.id, vars.body)),
    onSuccess: () => invalidateTxAndDashboard(qc),
  });
}
