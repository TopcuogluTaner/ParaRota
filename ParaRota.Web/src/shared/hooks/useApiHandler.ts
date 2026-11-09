import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { http } from '@shared/api/httpClient';
import { SweetAlert } from '@shared/lib/sweetAlert';
import { resolveApiError } from '@shared/lib/apiError';
import type { ApiResponse } from '@shared/types/apiResponse';

interface Options {
  silent?: boolean;
}

interface Result<R> {
  success: boolean;
  data: R | null;
  message: string;
}

export function useApiHandler<T = unknown>(
  endpoint: string,
  options: Options = {},
) {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);

  const wrap = useCallback(
    async <R,>(req: Promise<{ data: ApiResponse<R> }>, showSuccess: boolean): Promise<Result<R>> => {
      setLoading(true);
      try {
        const resp = await req;
        const payload = resp.data;
        if (!payload.isSuccess) {
          const msg = resolveApiError({ response: { data: payload } }, 'errors:UNEXPECTED');
          if (!options.silent) SweetAlert.error(msg);
          return { success: false, data: null, message: msg };
        }
        if (showSuccess && !options.silent) {
          SweetAlert.success(payload.message ?? t('successGeneric'));
        }
        return { success: true, data: payload.data, message: payload.message ?? '' };
      } catch (err) {
        const msg = resolveApiError(err, 'errors:UNEXPECTED');
        if (!options.silent) SweetAlert.error(msg);
        return { success: false, data: null, message: msg };
      } finally {
        setLoading(false);
      }
    },
    [options.silent, t],
  );

  const getItems = useCallback(
    (query?: string) => wrap<T[]>(http.get(`/${endpoint}${query ? `?${query}` : ''}`), false),
    [endpoint, wrap],
  );
  const getItem = useCallback(
    (id: string | number) => wrap<T>(http.get(`/${endpoint}/${id}`), false),
    [endpoint, wrap],
  );
  const addItem = useCallback(
    (data: Partial<T>) => wrap<T>(http.post(`/${endpoint}`, data), true),
    [endpoint, wrap],
  );
  const updateItem = useCallback(
    (id: string | number, data: Partial<T>) => wrap<T>(http.put(`/${endpoint}/${id}`, data), true),
    [endpoint, wrap],
  );
  const patchItem = useCallback(
    (id: string | number, data: Partial<T>) => wrap<T>(http.patch(`/${endpoint}/${id}`, data), true),
    [endpoint, wrap],
  );
  const deleteItem = useCallback(
    (id: string | number) => wrap<unknown>(http.delete(`/${endpoint}/${id}`), true),
    [endpoint, wrap],
  );

  return { loading, getItems, getItem, addItem, updateItem, patchItem, deleteItem };
}
