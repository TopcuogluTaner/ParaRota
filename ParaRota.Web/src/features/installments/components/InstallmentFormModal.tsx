import { Button, CircularProgress } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useCreateInstallmentPlan, useUpdateInstallmentPlan } from '../api/useInstallments';
import { useInstallmentFormState } from './useInstallmentFormState';
import { InstallmentFormFields } from './InstallmentFormFields';
import type { RecurringRuleDto } from '@shared/api/types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Doluysa düzenleme modu: yalnız açıklama/kategori/not değişir (tutar/sayı/tarih kilitli). */
  rule?: RecurringRuleDto | null;
}

/**
 * Taksitli alışveriş formu. Kayıt mevcut RecurringRule altyapısına düşer
 * (aylık + gider + autoApprove, endDate'i server hesaplar); geçmiş başlangıçta
 * motor taksitleri anında backfill eder.
 */
export function InstallmentFormModal({ open, onClose, rule }: Props) {
  const { t } = useTranslation(['installments', 'common']);
  const mode = rule ? 'edit' : 'create';

  const create = useCreateInstallmentPlan();
  const update = useUpdateInstallmentPlan();
  const isPending = create.isPending || update.isPending;

  const {
    form,
    set,
    count,
    amountValid,
    total,
    monthly,
    lastInstallment,
    hasResidual,
    canSubmit,
    attempted,
    setAttempted,
    descriptionMissing,
    categoryMissing,
    countInvalid,
  } = useInstallmentFormState(open, rule);

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (isPending) return;
    if (!canSubmit) {
      setAttempted(true);
      toast.error(t('common:fillRequired'), { id: 'installment-form-validate' });
      return;
    }
    try {
      if (rule) {
        // Kilitli alanlar (tutar/sıklık/başlangıç) entity'deki değerleriyle AYNEN geri
        // gönderilir — backend INSTALLMENT_RULE_LOCKED guard'ı fark görürse reddeder.
        await update.mutateAsync({
          id: rule.id,
          body: {
            description: form.description.trim(),
            nature: rule.nature,
            categoryId: form.categoryId!,
            amount: rule.amount,
            currency: rule.currency,
            frequency: rule.frequency,
            startDate: rule.startDate,
            endDate: rule.endDate,
            autoApprove: rule.autoApprove,
            isActive: rule.isActive,
            notes: form.notes.trim() || undefined,
          },
        });
        toast.success(t('toast_updated'));
      } else {
        // endDate gönderilmez — server son taksit ayının gün sonunu hesaplar.
        await create.mutateAsync({
          description: form.description.trim(),
          type: 'expense',
          nature: 'fixed',
          categoryId: form.categoryId!,
          amount: monthly,
          currency: 'TRY',
          frequency: 'monthly',
          startDate: form.firstDate,
          autoApprove: true,
          notes: form.notes.trim() || undefined,
          installmentCount: count,
          installmentTotalAmount: total,
        });
        toast.success(t('toast_created'));
      }
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={handleClose}
      icon="mdi:credit-card-clock-outline"
      title={mode === 'create' ? t('form_modalTitle_create') : t('form_modalTitle_edit')}
      subtitle={mode === 'create' ? t('form_modalSubtitle_create') : t('form_modalSubtitle_edit')}
      maxWidth={560}
      actions={
        <>
          <Button variant="text" onClick={handleClose} disabled={isPending}>
            {t('common:cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isPending}
            startIcon={
              isPending ? (
                <CircularProgress size={16} thickness={5} />
              ) : (
                <Icon icon="mdi:check" width={18} />
              )
            }
          >
            {mode === 'create' ? t('common:add') : t('common:save')}
          </Button>
        </>
      }
    >
      <InstallmentFormFields
        form={form}
        set={set}
        mode={mode}
        rule={rule}
        count={count}
        amountValid={amountValid}
        total={total}
        monthly={monthly}
        lastInstallment={lastInstallment}
        hasResidual={hasResidual}
        attempted={attempted}
        descriptionMissing={descriptionMissing}
        categoryMissing={categoryMissing}
        countInvalid={countInvalid}
      />
    </ZoomModal>
  );
}
