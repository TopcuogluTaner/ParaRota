import Swal from 'sweetalert2';
import i18n from '@shared/i18n';
import type { ApiResponse } from '@shared/types/apiResponse';
import { resolveApiError } from '@shared/lib/apiError';

const tr = (key: string) => i18n.t(key, { ns: 'common' });

export const SweetAlert = {
  success(message: string, timer = 1800) {
    return Swal.fire({
      icon: 'success',
      title: tr('alertTitle_success'),
      text: message,
      timer,
      showConfirmButton: false,
    });
  },
  error(message: string) {
    return Swal.fire({ icon: 'error', title: tr('alertTitle_error'), text: message });
  },
  warning(message: string) {
    return Swal.fire({ icon: 'warning', title: tr('alertTitle_warning'), text: message });
  },
  info(message: string) {
    return Swal.fire({ icon: 'info', title: tr('alertTitle_info'), text: message });
  },
  async confirm(title: string, text?: string): Promise<boolean> {
    const r = await Swal.fire({
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: tr('yes'),
      cancelButtonText: tr('cancel'),
    });
    return r.isConfirmed;
  },
  fromApi<T>(resp: ApiResponse<T>) {
    if (resp.isSuccess) {
      this.success(resp.message ?? tr('success'));
    } else {
      // errorCode -> i18n; yoksa message fallback. (resolver bir hata nesnesi bekler)
      this.error(resolveApiError({ response: { data: resp } }, 'errors:UNEXPECTED'));
    }
  },
  /** Yakalanan bir hata nesnesini (axios/mutation) kullanıcının dilinde modal olarak gösterir. */
  apiError(err: unknown) {
    return this.error(resolveApiError(err, 'errors:UNEXPECTED'));
  },
};
