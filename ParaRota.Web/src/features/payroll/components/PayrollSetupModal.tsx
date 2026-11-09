import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { dayjs, formatDate } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import type { PayrollResultDto } from '@shared/api/types';
import { useCategoriesQuery, useCreateCategory } from '@features/categories/api/useCategories';
import { useCreateRecurringRule } from '@features/recurring/api/useRecurringRules';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Hesaplanan brüt (kuralda payrollGrossMonthly olarak saklanır). */
  gross: number;
  /** Hesap sonucu — seçilen ayın nominal neti karttaki görünür tutar olur. */
  result: PayrollResultDto;
}

// Varsayılan maaş günü = BU ayın 1'i (geçmiş tarih → kurulunca bu ayın maaşı hemen
// gelir olarak işlenir + her ay tekrarlar). İleri tarih seçilirse ilk gelir o gün düşer.
const thisMonthFirst = () => dayjs().startOf('month').format('YYYY-MM-DD');

// Maaş otomatiği kur: aylık tekrarlayan bir "maaş kuralı" oluşturur. Backend her ay,
// seçilen günde, o ay/yılın resmi kümülatif netini hesaplayıp gelir olarak ekler
// (net ay-ay değiştiği için tek sabit tutar yerine payrollGrossMonthly saklanır).
// "Maaş" gelir kategorisi yoksa oluşturulur.
export function PayrollSetupModal({ open, onClose, gross, result }: Props) {
  const { t } = useTranslation(['payroll', 'common']);

  const cats = useCategoriesQuery();
  const createCategory = useCreateCategory();
  const createRule = useCreateRecurringRule();

  const [payday, setPayday] = useState(thisMonthFirst());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    // Modal her açılışta varsayılan maaş gününe sıfırlanır (codebase pattern'i).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setPayday(thisMonthFirst());
  }, [open]);

  const avgNet = result.annualNet / Math.max(1, result.months.length);

  const submit = async () => {
    if (!payday || adding) return;
    setAdding(true);
    try {
      const salaryName = t('payroll:salaryCategoryName');
      let categoryId = (cats.data ?? []).find(
        (c) =>
          c.type === 'income' &&
          (c.name.toLocaleLowerCase() === salaryName.toLocaleLowerCase() || /maa[şs]|salary/i.test(c.name)),
      )?.id;
      if (!categoryId) {
        const created = await createCategory.mutateAsync({
          name: salaryName,
          icon: 'mdi:cash-multiple',
          type: 'income',
        });
        categoryId = created.id;
      }
      // Nominal tutar (listede görünür); gerçek tutar her ay backend'de yeniden hesaplanır.
      const startMonthNet =
        result.months.find((m) => m.month === dayjs(payday).month() + 1)?.net ?? avgNet;
      await createRule.mutateAsync({
        description: salaryName,
        type: 'income',
        nature: 'fixed',
        categoryId,
        amount: Math.round(startMonthNet * 100) / 100,
        currency: 'TRY',
        frequency: 'monthly',
        startDate: `${payday}T12:00:00`,
        autoApprove: true,
        notes: t('payroll:incomeNote'),
        payrollGrossMonthly: gross,
      });
      toast.success(t('payroll:salarySetupSuccess', { date: formatDate(payday) }));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    } finally {
      setAdding(false);
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={() => !adding && onClose()}
      icon="mdi:calendar-sync-outline"
      title={t('payroll:setupModalTitle')}
      subtitle={t('payroll:setupModalSubtitle')}
      maxWidth={480}
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={adding}>
            {t('common:cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={() => void submit()}
            disabled={adding || !payday}
            startIcon={adding ? <CircularProgress size={16} thickness={5} /> : <Icon icon="mdi:check" width={16} />}
          >
            {t('payroll:setupSubmit')}
          </Button>
        </>
      }
    >
      <Stack spacing={2} sx={{ pt: 0.4 }}>
        <TextField
          type="date"
          label={t('payroll:paydayLabel')}
          value={payday}
          onChange={(e) => setPayday(e.target.value)}
          fullWidth
          autoFocus
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'flex-start',
            p: 1.4,
            borderRadius: 1.6,
            bgcolor: (th) => alpha(th.palette.info.main, 0.08),
            border: '1px solid',
            borderColor: (th) => alpha(th.palette.info.main, 0.2),
          }}
        >
          <Icon icon="mdi:information-outline" width={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
            {t('payroll:paydayHint')}
          </Typography>
        </Box>
      </Stack>
    </ZoomModal>
  );
}
