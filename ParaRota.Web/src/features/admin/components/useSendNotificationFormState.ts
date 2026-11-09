import { useState } from 'react';
import type { NotificationSeverity } from '@shared/api/types';

export type TargetMode = 'broadcast' | 'role' | 'single';

export interface SendNotificationFormState {
  mode: TargetMode;
  role: string;
  userId: string;
  title: string;
  message: string;
  url: string;
  severity: NotificationSeverity;
}

export interface SendNotificationFormErrors {
  title?: boolean;
  message?: boolean;
  userId?: boolean;
}

const INITIAL: SendNotificationFormState = {
  mode: 'broadcast',
  role: 'User',
  userId: '',
  title: '',
  message: '',
  url: '',
  severity: 'info',
};

export interface SendNotificationFormStateApi {
  form: SendNotificationFormState;
  set: <K extends keyof SendNotificationFormState>(key: K, value: SendNotificationFormState[K]) => void;
  errors: SendNotificationFormErrors;
  canSubmit: boolean;
  /**
   * Tüm form alanlarını doğrula; varsa errors state'ini günceller, döner.
   * Boş döner → submit edilebilir.
   */
  validate: () => SendNotificationFormErrors;
  /** Submit sonrası tema state'leri korur (severity + mode), text alanlarını sıfırlar. */
  resetAfterSubmit: () => void;
}

/**
 * AdminPage SendNotificationForm için state hook'u.
 * Validation logic'i imperative setErrors yerine declarative validate()'le —
 * test yazmak kolaylaşır, errors handler ile decouple.
 */
export function useSendNotificationFormState(isPending: boolean): SendNotificationFormStateApi {
  const [form, setForm] = useState<SendNotificationFormState>(INITIAL);
  const [errors, setErrors] = useState<SendNotificationFormErrors>({});

  const set = <K extends keyof SendNotificationFormState>(
    key: K,
    value: SendNotificationFormState[K],
  ) => {
    setForm((p) => ({ ...p, [key]: value }));
    // Kullanıcı düzeltirse ilgili error'u temizle (typing feedback).
    if (key === 'title' && errors.title) setErrors((e) => ({ ...e, title: undefined }));
    if (key === 'message' && errors.message) setErrors((e) => ({ ...e, message: undefined }));
    if (key === 'userId' && errors.userId) setErrors((e) => ({ ...e, userId: undefined }));
  };

  const canSubmit =
    !isPending &&
    form.title.trim().length > 0 &&
    form.message.trim().length > 0 &&
    (form.mode !== 'single' || (form.userId.trim().length > 0 && !Number.isNaN(Number(form.userId))));

  const validate = (): SendNotificationFormErrors => {
    const e: SendNotificationFormErrors = {};
    if (!form.title.trim()) e.title = true;
    if (!form.message.trim()) e.message = true;
    if (form.mode === 'single') {
      const n = Number(form.userId);
      if (!form.userId.trim() || Number.isNaN(n) || n <= 0) e.userId = true;
    }
    setErrors(e);
    return e;
  };

  const resetAfterSubmit = () => {
    setForm((p) => ({ ...p, title: '', message: '', url: '', userId: '' }));
    setErrors({});
  };

  return { form, set, errors, canSubmit, validate, resetAfterSubmit };
}
