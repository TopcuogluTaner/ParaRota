import { Button, CircularProgress } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import type { RecurringRuleDto } from '@shared/api/types';
import { useCreateRecurringRule, useUpdateRecurringRule } from '../api/useRecurringRules';
import { useRecurringRuleFormState, type RecurringRuleFormState } from './useRecurringRuleFormState';
import { RecurringRuleFormFields } from './RecurringRuleFormFields';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  rule?: RecurringRuleDto;
  /** Abonelik kataloğundan ön doldurma — yalnız create modunda uygulanır. */
  preset?: Partial<RecurringRuleFormState> | null;
}

export function RecurringRuleFormModal({ open, onClose, mode, rule, preset }: Props) {
  const { t } = useTranslation(['pages', 'common']);

  const createMutation = useCreateRecurringRule();
  const updateMutation = useUpdateRecurringRule();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const {
    form,
    set,
    onTypeChange,
    amountNum,
    canSubmit,
    attempted,
    setAttempted,
    descriptionMissing,
    categoryMissing,
    amountInvalid,
  } = useRecurringRuleFormState(open, mode, rule, preset);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    // Eksik alan(lar) varsa: tıklamayı engelleme — net uyarı + kırmızı alan göster.
    if (!canSubmit || form.categoryId === null) {
      setAttempted(true);
      toast.error(t('recurring.toastError'), { id: 'recurring-validate' });
      return;
    }
    try {
      const baseBody = {
        description: form.description.trim(),
        nature: 'fixed' as const,
        categoryId: form.categoryId,
        amount: amountNum,
        currency: form.currency.toUpperCase(),
        frequency: form.frequency,
        startDate: `${form.startDate}T00:00:00`,
        endDate: form.endDate ? `${form.endDate}T23:59:59` : undefined,
        autoApprove: form.autoApprove,
        notes: form.notes.trim() || undefined,
      };

      if (mode === 'create') {
        await createMutation.mutateAsync({ ...baseBody, type: form.type });
        toast.success(t('recurring.toastCreateSuccess'));
      } else if (rule) {
        await updateMutation.mutateAsync({
          id: rule.id,
          body: { ...baseBody, isActive: form.isActive },
        });
        toast.success(t('recurring.toastUpdateSuccess'));
      }
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, t('recurring.toastError')));
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={handleClose}
      icon={mode === 'create' ? 'mdi:repeat-variant' : 'mdi:pencil-outline'}
      title={mode === 'create' ? t('recurring.modalCreateTitle') : t('recurring.modalEditTitle')}
      subtitle={mode === 'create' ? t('recurring.modalCreateSubtitle') : t('recurring.modalEditSubtitle')}
      maxWidth={600}
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
      <RecurringRuleFormFields
        form={form}
        set={set}
        onTypeChange={onTypeChange}
        mode={mode}
        rule={rule}
        attempted={attempted}
        descriptionMissing={descriptionMissing}
        categoryMissing={categoryMissing}
        amountInvalid={amountInvalid}
      />
    </ZoomModal>
  );
}
