import { Button, CircularProgress } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useActiveHouseholdStore } from '@features/household/store/useActiveHouseholdStore';
import { useCreateDebt, useUpdateDebt } from '../api/useDebts';
import type { CreateDebtRequest, DebtDto } from '@shared/api/types/debts';
import { useDebtFormState } from './useDebtFormState';
import { DebtFormFields } from './DebtFormFields';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  debt?: DebtDto | null;
}

export function DebtFormModal({ open, onClose, mode, debt }: Props) {
  const { t } = useTranslation(['debts', 'common']);
  const activeHouseholdId = useActiveHouseholdStore((s) => s.activeId);

  const create = useCreateDebt();
  const update = useUpdateDebt();
  const isPending = create.isPending || update.isPending;

  const {
    form,
    set,
    amountNum,
    interestNum,
    installmentNum,
    canSubmit,
    attempted,
    setAttempted,
    titleMissing,
    counterpartyMissing,
    amountInvalid,
  } = useDebtFormState(open, mode, debt);

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (isPending) return;
    // Eksik alan(lar) varsa: tıklamayı engelleme — net uyarı + kırmızı alan göster.
    if (!canSubmit) {
      setAttempted(true);
      toast.error(t('common:fillRequired'), { id: 'debt-form-validate' });
      return;
    }
    try {
      if (mode === 'create') {
        const body: CreateDebtRequest = {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          kind: form.kind,
          amount: amountNum,
          currency: form.currency,
          counterpartyName: form.counterpartyName.trim(),
          interestRate: interestNum,
          startDate: form.startDate,
          dueDate: form.dueDate || undefined,
          installmentCount: installmentNum,
          installmentFrequency: installmentNum ? form.installmentFrequency : undefined,
          paymentMode: form.paymentMode,
          householdId: activeHouseholdId ?? undefined,
        };
        await create.mutateAsync(body);
        toast.success(t('form_toastCreated'));
      } else if (debt) {
        // Edit'te scope (HouseholdId), amount, currency, startDate ve kind kilitli —
        // DTO bunları bilerek taşımıyor.
        await update.mutateAsync({
          id: debt.id,
          body: {
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            counterpartyName: form.counterpartyName.trim(),
            interestRate: interestNum,
            dueDate: form.dueDate || undefined,
            status: debt.status,
          },
        });
        toast.success(t('form_toastUpdated'));
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
      icon={form.kind === 'payable' ? 'mdi:credit-card-clock-outline' : 'mdi:hand-coin-outline'}
      title={mode === 'create' ? t('form_modalTitle_create') : t('form_modalTitle_edit')}
      subtitle={t('form_modalSubtitle')}
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
            {mode === 'create' ? t('form_submit_create') : t('form_submit_edit')}
          </Button>
        </>
      }
    >
      <DebtFormFields
        form={form}
        set={set}
        installmentNum={installmentNum}
        mode={mode}
        attempted={attempted}
        titleMissing={titleMissing}
        counterpartyMissing={counterpartyMissing}
        amountInvalid={amountInvalid}
      />
    </ZoomModal>
  );
}
