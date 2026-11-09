import { useMutation, useQuery } from '@tanstack/react-query';
import { payrollApi } from '@shared/api/endpoints/payroll';
import { unwrap } from '@shared/api/unwrap';
import { queryClient } from '@shared/api/queryClient';
import { queryKeys } from '@shared/api/queryKeys';
import type { SeveranceCeilingCreateRequest, SeveranceCeilingUpdateRequest } from '@shared/api/types';

const invalidate = () =>
  queryClient.invalidateQueries({ queryKey: queryKeys.severanceCeilings.all });

export function useSeveranceCeilingsAdminList() {
  return useQuery({
    queryKey: queryKeys.severanceCeilings.adminList(),
    queryFn: () => unwrap(payrollApi.ceilingsAdminList()),
  });
}

export function useCreateSeveranceCeiling() {
  return useMutation({
    mutationFn: (body: SeveranceCeilingCreateRequest) => unwrap(payrollApi.ceilingCreate(body)),
    onSuccess: invalidate,
  });
}

export function useUpdateSeveranceCeiling() {
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: SeveranceCeilingUpdateRequest }) =>
      unwrap(payrollApi.ceilingUpdate(id, body)),
    onSuccess: invalidate,
  });
}

export function useDeleteSeveranceCeiling() {
  return useMutation({
    mutationFn: (id: number) => unwrap(payrollApi.ceilingRemove(id)),
    onSuccess: invalidate,
  });
}
