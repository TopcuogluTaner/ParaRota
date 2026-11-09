import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { SignalBadge } from '@shared/components/SignalBadge';
import { Money } from '@shared/components/Money';
import { dayjs, formatDate } from '@shared/lib/dateFormat';
import { parseAmount } from '@shared/lib/parseAmount';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import type { RecurringRuleDto } from '@shared/api/types';
import { useDeleteRecurringRule, useUpdateRecurringRule } from '@features/recurring/api/useRecurringRules';
import { useApplyPayrollRaise } from '../api/usePayroll';

interface Props {
  open: boolean;
  rule: RecurringRuleDto | null;
  onClose: () => void;
}

type Mode = 'main' | 'raise' | 'day';

const nextMonthFirst = () => dayjs().add(1, 'month').startOf('month').format('YYYY-MM-DD');

// Maaş otomatiğini yönetir (Tekrarlayanlar'dan ve Maaş Hesaplama'dan açılır):
// zam gir / maaş gününü değiştir / durdur. Zam ve gün değişimi iç içe modal
// olmasın diye aynı modal içinde mod değiştirerek gösterilir (mobil ile aynı).
export function PayrollManageModal({ open, rule, onClose }: Props) {
  const { t } = useTranslation(['payroll', 'common']);

  const raise = useApplyPayrollRaise();
  const update = useUpdateRecurringRule();
  const remove = useDeleteRecurringRule();
  const isBusy = raise.isPending || update.isPending || remove.isPending;

  const [mode, setMode] = useState<Mode>('main');
  const [grossInput, setGrossInput] = useState('');
  const [effective, setEffective] = useState(nextMonthFirst());
  const [dayInput, setDayInput] = useState('');
  const [stopOpen, setStopOpen] = useState(false);

  useEffect(() => {
    if (open && rule) {
      // Modal her açılışta kuralın güncel değerleriyle sıfırlanır (codebase pattern'i).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode('main');
      setGrossInput(String(Math.round(rule.payrollGrossMonthly ?? 0)));
      setEffective(nextMonthFirst());
      setDayInput(dayjs(rule.nextRunDate).format('YYYY-MM-DD'));
    }
  }, [open, rule]);

  if (!rule) return null;

  const payday = dayjs(rule.startDate).date();
  const gross = rule.payrollGrossMonthly ?? 0;

  const handleClose = () => {
    if (isBusy) return;
    onClose();
  };

  const submitRaise = async () => {
    const g = parseAmount(grossInput);
    if (!(Number.isFinite(g) && g > 0)) {
      toast.error(t('payroll:invalidGross'), { id: 'payroll-raise-validate' });
      return;
    }
    try {
      await raise.mutateAsync({ ruleId: rule.id, gross: g, effectiveDate: `${effective}T12:00:00` });
      toast.success(t('payroll:raiseSuccess', { date: formatDate(effective) }));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  const submitDay = async () => {
    if (!dayInput) return;
    try {
      await update.mutateAsync({
        id: rule.id,
        body: {
          description: rule.description,
          nature: rule.nature,
          categoryId: rule.categoryId,
          amount: rule.amount,
          currency: rule.currency,
          frequency: rule.frequency,
          startDate: `${dayInput}T12:00:00`,
          endDate: rule.endDate,
          autoApprove: rule.autoApprove,
          isActive: rule.isActive,
          notes: rule.notes,
        },
      });
      toast.success(t('payroll:changeDaySuccess', { date: formatDate(dayInput) }));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  const stop = async () => {
    try {
      await remove.mutateAsync(rule.id);
      toast.success(t('payroll:stopSuccess'));
      setStopOpen(false);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  const subModalActions = (onSubmit: () => void, label: string, pending: boolean) => (
    <>
      <Button variant="text" onClick={() => setMode('main')} disabled={pending}>
        {t('common:back')}
      </Button>
      <Button
        variant="contained"
        onClick={onSubmit}
        disabled={pending}
        startIcon={pending ? <CircularProgress size={16} thickness={5} /> : <Icon icon="mdi:check" width={16} />}
      >
        {label}
      </Button>
    </>
  );

  return (
    <>
      <ZoomModal
        open={open}
        onClose={handleClose}
        icon="mdi:calendar-sync-outline"
        title={mode === 'raise' ? t('payroll:raiseModalTitle') : mode === 'day' ? t('payroll:dayModalTitle') : rule.description}
        subtitle={
          mode === 'raise'
            ? t('payroll:raiseModalSubtitle')
            : mode === 'day'
              ? t('payroll:dayLabel')
              : t('payroll:automationTitle')
        }
        maxWidth={480}
        actions={
          mode === 'raise'
            ? subModalActions(() => void submitRaise(), t('payroll:raiseSubmit'), raise.isPending)
            : mode === 'day'
              ? subModalActions(() => void submitDay(), t('payroll:daySubmit'), update.isPending)
              : undefined
        }
      >
        {mode === 'main' ? (
          <Stack spacing={1.6}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: (th) => alpha(th.palette.success.main, 0.22),
                bgcolor: (th) => alpha(th.palette.success.main, 0.06),
              }}
            >
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.6 }}>
                <Money value={gross} currency={rule.currency} size="xl" weight={600} tone="neutral" />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('payroll:automationGrossSuffix')}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <SignalBadge tone="go" size="xs" variant="soft">
                  {t('payroll:automationActive')}
                </SignalBadge>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('payroll:automationPayday', { day: payday })} · {t('payroll:automationNext', { date: formatDate(rule.nextRunDate) })}
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<Icon icon="mdi:trending-up" width={18} />}
              onClick={() => setMode('raise')}
              fullWidth
            >
              {t('payroll:raiseCta')}
            </Button>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
              <Button
                variant="outlined"
                startIcon={<Icon icon="mdi:calendar-edit" width={18} />}
                onClick={() => setMode('day')}
                sx={{ flex: 1 }}
              >
                {t('payroll:changeDayCta')}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Icon icon="mdi:stop-circle-outline" width={18} />}
                onClick={() => setStopOpen(true)}
                sx={{ flex: 1 }}
              >
                {t('payroll:stopCta')}
              </Button>
            </Stack>
          </Stack>
        ) : mode === 'raise' ? (
          <Stack spacing={2} sx={{ pt: 0.4 }}>
            <TextField
              label={t('payroll:raiseGrossLabel')}
              value={grossInput}
              onChange={(e) => setGrossInput(e.target.value)}
              fullWidth
              autoFocus
              slotProps={{
                input: {
                  inputMode: 'decimal',
                  startAdornment: <InputAdornment position="start">₺</InputAdornment>,
                },
              }}
            />
            <TextField
              type="date"
              label={t('payroll:raiseEffectiveLabel')}
              value={effective}
              onChange={(e) => setEffective(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ pt: 0.4 }}>
            <TextField
              type="date"
              label={t('payroll:dayLabel')}
              value={dayInput}
              onChange={(e) => setDayInput(e.target.value)}
              fullWidth
              autoFocus
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        )}
      </ZoomModal>

      <ConfirmDialog
        open={stopOpen}
        onClose={() => setStopOpen(false)}
        onConfirm={() => void stop()}
        tone="error"
        title={t('payroll:stopConfirmTitle')}
        body={t('payroll:stopConfirmMsg')}
        confirmLabel={t('payroll:stopCta')}
        isPending={remove.isPending}
      />
    </>
  );
}
