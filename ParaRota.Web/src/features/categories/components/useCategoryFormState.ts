import { useEffect, useState } from 'react';
import type { CategoryDto, TxType } from '@shared/api/types';

export interface CategoryFormState {
  type: TxType;
  name: string;
  icon: string;
  emoji: string;
  color: string;
}

const EMPTY: CategoryFormState = {
  type: 'expense',
  name: '',
  icon: 'mdi:tag-outline',
  emoji: '',
  color: '#0F8B6C',
};

function fromCategory(c: CategoryDto): CategoryFormState {
  return {
    type: c.type,
    name: c.name,
    icon: c.icon || 'mdi:tag-outline',
    emoji: c.emoji ?? '',
    color: c.color || '#0F8B6C',
  };
}

const HEX_RE = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;
const FALLBACK_COLOR = '#5A6E7C';

export interface CategoryFormStateApi {
  form: CategoryFormState;
  set: <K extends keyof CategoryFormState>(key: K, value: CategoryFormState[K]) => void;
  colorIsValid: boolean;
  nameMissing: boolean;
  iconMissing: boolean;
  safeColor: string;
  canSubmit: boolean;
}

/**
 * CategoryFormModal form state'i + hex color validation.
 * Geçersiz hex girilirse `safeColor` fallback'a düşer (preview için).
 */
export function useCategoryFormState(
  open: boolean,
  mode: 'create' | 'edit',
  category: CategoryDto | undefined,
  isPending: boolean,
): CategoryFormStateApi {
  const [form, setForm] = useState<CategoryFormState>(EMPTY);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(mode === 'edit' && category ? fromCategory(category) : EMPTY);
  }, [open, mode, category]);

  const set = <K extends keyof CategoryFormState>(key: K, value: CategoryFormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const colorIsValid = HEX_RE.test(form.color);
  const safeColor = colorIsValid ? form.color : FALLBACK_COLOR;
  const nameMissing = form.name.trim().length === 0;
  const iconMissing = form.icon.trim().length === 0;
  const canSubmit = !isPending && !nameMissing && !iconMissing && colorIsValid;

  return { form, set, colorIsValid, nameMissing, iconMissing, safeColor, canSubmit };
}
