import { useEffect, useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import type { CategoryDto } from '@shared/api/types';
import { useCreateCategory, useUpdateCategory } from '../api/useCategories';
import { useCategoryFormState } from './useCategoryFormState';
import { CategoryFormFields } from './CategoryFormFields';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  category?: CategoryDto;
}

export function CategoryFormModal({ open, onClose, mode, category }: Props) {
  const { t } = useTranslation('pages');
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const { form, set, colorIsValid, nameMissing, iconMissing, safeColor } = useCategoryFormState(
    open,
    mode,
    category,
    isSubmitting,
  );
  // İlk başarısız "Kaydet" denemesinden sonra eksik/geçersiz alanları işaretle.
  const [attempted, setAttempted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setAttempted(false);
  }, [open]);

  const isSystem = mode === 'edit' && category?.isSystem === true;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    // Eksik/geçersiz alan varsa: tıklamayı engelleme — uyarı + kırmızı alan göster.
    if (nameMissing || iconMissing || !colorIsValid) {
      setAttempted(true);
      toast.error(t('categories.toastError'), { id: 'category-form-validate' });
      return;
    }
    const payload = {
      name: form.name.trim(),
      icon: form.icon.trim(),
      emoji: form.emoji.trim() || undefined,
      color: form.color || undefined,
    };
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({ ...payload, type: form.type });
        toast.success(t('categories.toastCreateSuccess'));
      } else if (category) {
        await updateMutation.mutateAsync({ id: category.id, body: payload });
        toast.success(t('categories.toastUpdateSuccess'));
      }
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, t('categories.toastError')));
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={handleClose}
      maxWidth={640}
      icon={mode === 'create' ? 'mdi:plus-circle-outline' : 'mdi:pencil-outline'}
      title={mode === 'create' ? t('categories.modalCreateTitle') : t('categories.modalEditTitle')}
      subtitle={mode === 'create' ? t('categories.modalCreateSubtitle') : t('categories.modalEditSubtitle')}
      actions={
        <>
          <Button variant="text" onClick={handleClose} disabled={isSubmitting}>
            {t('common:cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={16} thickness={5} />
              ) : (
                <Icon icon="mdi:check" width={18} />
              )
            }
          >
            {t('common:save')}
          </Button>
        </>
      }
    >
      <CategoryFormFields
        form={form}
        set={set}
        safeColor={safeColor}
        mode={mode}
        isSystem={isSystem}
        attempted={attempted}
        colorIsValid={colorIsValid}
        nameMissing={nameMissing}
        iconMissing={iconMissing}
      />
    </ZoomModal>
  );
}
