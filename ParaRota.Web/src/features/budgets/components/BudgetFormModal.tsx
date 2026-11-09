import { useEffect, useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import type { BudgetDto } from '@shared/api/types';
import { useCreateBudget, useUpdateBudget } from '../api/useBudgets';
import { useBudgetFormState } from './useBudgetFormState';
import { BudgetFormFields } from './BudgetFormFields';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  budget?: BudgetDto;
  // Create modunda hangi ay/yıla göre default açılacağı.
  defaultMonth?: number;
  defaultYear?: number;
}

export function BudgetFormModal({ open, onClose, mode, budget, defaultMonth, defaultYear }: Props) {
  const { t } = useTranslation(['pages', 'common']);
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const { form, set, limitNum, categoryMissing, limitInvalid } = useBudgetFormState(
    open,
    mode,
    budget,
    isSubmitting,
    defaultMonth,
    defaultYear,
  );
  // İlk başarısız "Kaydet" denemesinden sonra eksik alanları kırmızı + uyarıyla göster.
  const [attempted, setAttempted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setAttempted(false);
  }, [open]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    // Eksik alan(lar) varsa: tıklamayı engelleme — net uyarı + kırmızı alan göster.
    if (categoryMissing || limitInvalid || form.categoryId === null) {
      setAttempted(true);
      toast.error(t('budgets.toastError'), { id: 'budget-form-validate' });
      return;
    }
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          categoryId: form.categoryId,
          monthlyLimit: limitNum,
          month: form.month,
          year: form.year,
          warnThreshold: form.warnThreshold,
        });
        toast.success(t('budgets.toastCreateSuccess'));
      } else if (budget) {
        await updateMutation.mutateAsync({
          id: budget.id,
          body: {
            monthlyLimit: limitNum,
            warnThreshold: form.warnThreshold,
          },
        });
        toast.success(t('budgets.toastUpdateSuccess'));
      }
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, t('budgets.toastError')));
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={handleClose}
      icon={mode === 'create' ? 'mdi:plus-circle-outline' : 'mdi:pencil-outline'}
      title={mode === 'create' ? t('budgets.modalCreateTitle') : t('budgets.modalEditTitle')}
      subtitle={mode === 'create' ? t('budgets.modalCreateSubtitle') : t('budgets.modalEditSubtitle')}
      maxWidth={560}
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
      <BudgetFormFields
        form={form}
        set={set}
        limitNum={limitNum}
        mode={mode}
        attempted={attempted}
        categoryMissing={categoryMissing}
        limitInvalid={limitInvalid}
      />
    </ZoomModal>
  );
}
