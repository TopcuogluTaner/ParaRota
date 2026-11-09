import { useQuery, useMutation } from '@tanstack/react-query';
import { debtApi } from '@shared/api/endpoints/debts';
import { unwrap } from '@shared/api/unwrap';
import { queryClient } from '@shared/api/queryClient';
import { queryKeys } from '@shared/api/queryKeys';
import type {
  AddDebtPaymentRequest,
  CreateDebtRequest,
  DebtStatus,
  UpdateDebtRequest,
} from '@shared/api/types';

export function useDebtsQuery(status?: DebtStatus) {
  return useQuery({
    queryKey: queryKeys.debts.list(status),
    queryFn: () => unwrap(debtApi.list(status)),
  });
}

export function useDebtQuery(id: number | null) {
  return useQuery({
    queryKey: queryKeys.debts.detail(id ?? 0),
    queryFn: () => unwrap(debtApi.get(id as number)),
    enabled: id != null,
  });
}

export function useCreateDebt() {
  return useMutation({
    mutationFn: (body: CreateDebtRequest) => unwrap(debtApi.create(body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.debts.all }),
  });
}

export function useUpdateDebt(id: number) {
  return useMutation({
    mutationFn: (body: UpdateDebtRequest) => unwrap(debtApi.update(id, body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.debts.all }),
  });
}

export function useDeleteDebt() {
  return useMutation({
    mutationFn: (id: number) => unwrap(debtApi.remove(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.debts.all }),
  });
}

export function useAddDebtPayment(id: number) {
  return useMutation({
    mutationFn: (body: AddDebtPaymentRequest) => unwrap(debtApi.addPayment(id, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.debts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
