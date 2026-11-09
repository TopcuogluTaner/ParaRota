import { useQuery, useMutation } from '@tanstack/react-query';
import { transactionApi } from '@shared/api/endpoints/transactions';
import { unwrap } from '@shared/api/unwrap';
import { queryClient } from '@shared/api/queryClient';
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
  });
}

export function useCreateTransaction() {
  return useMutation({
    mutationFn: (body: TransactionCreateRequest) => unwrap(transactionApi.create(body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}

export function useUpdateTransaction(id: number) {
  return useMutation({
    mutationFn: (body: TransactionUpdateRequest) => unwrap(transactionApi.update(id, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}

export function useDeleteTransaction() {
  return useMutation({
    mutationFn: (id: number) => unwrap(transactionApi.remove(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useMoveTransactionScope() {
  return useMutation({
    mutationFn: (vars: { id: number; body: MoveTransactionScopeRequest }) =>
      unwrap(transactionApi.moveScope(vars.id, vars.body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}
