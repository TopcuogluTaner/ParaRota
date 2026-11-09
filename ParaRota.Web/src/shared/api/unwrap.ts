import type { AxiosResponse } from 'axios';
import type { ApiResponse } from '@shared/types/apiResponse';

// ────────────────────────────────────────────────────────────────────────────
// Backend wraps everything in ApiResponse<T>. TanStack Query stores T, not
// ApiResponse<T> — so each query function pipes the axios response through
// unwrap(). isSuccess=false is rethrown so query state goes to error.
// ────────────────────────────────────────────────────────────────────────────
export async function unwrap<T>(promise: Promise<AxiosResponse<ApiResponse<T>>>): Promise<T> {
  const resp = await promise;
  const payload = resp.data;
  if (!payload.isSuccess) {
    const err = new Error(payload.message ?? 'API call failed');
    (err as { response?: unknown }).response = { data: payload, status: payload.statusCode };
    throw err;
  }
  return payload.data;
}
