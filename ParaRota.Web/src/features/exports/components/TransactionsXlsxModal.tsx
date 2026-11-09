import { useMemo, useState } from 'react';
import { Box, Button, Chip, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useCategoriesQuery } from '@features/categories/api/useCategories';
import { useTransactionsXlsxMutation } from '../api/useExports';

interface Props {
  open: boolean;
  onClose: () => void;
}

type TxTypeFilter = 'income' | 'expense';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthIso() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export function TransactionsXlsxModal({ open, onClose }: Props) {
  const { t } = useTranslation(['exports', 'common']);
  const categoriesQ = useCategoriesQuery();

  const [startDate, setStartDate] = useState(firstOfMonthIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [types, setTypes] = useState<TxTypeFilter[]>([]);
  // İlk başarısız "İndir" denemesinden sonra geçersiz tarih aralığını kırmızı + uyarıyla göster.
  const [attempted, setAttempted] = useState(false);

  const mutation = useTransactionsXlsxMutation();
  const isPending = mutation.isPending;

  const categories = useMemo(() => categoriesQ.data ?? [], [categoriesQ.data]);
  const datesValid = startDate.length > 0 && endDate.length > 0 && endDate >= startDate;
  const dateRangeInvalid = !datesValid;

  const toggleCategory = (id: number) => {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleType = (ty: TxTypeFilter) => {
    setTypes((prev) => (prev.includes(ty) ? prev.filter((x) => x !== ty) : [...prev, ty]));
  };

  const handleSubmit = async () => {
    if (isPending) return;
    // Geçersiz tarih aralığı: tıklamayı engelleme — net uyarı + alan hatası göster.
    if (dateRangeInvalid) {
      setAttempted(true);
      toast.error(t('help_dateRange'), { id: 'xlsx-date-validate' });
      return;
    }
    try {
      await mutation.mutateAsync({
        startDate,
        endDate,
        categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
        types: types.length > 0 ? types : undefined,
      });
      toast.success(t('toast_xlsxReady'));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, t('toast_error')));
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={() => !isPending && onClose()}
      icon="mdi:file-excel-box"
      title={t('modal_xlsx_title')}
      subtitle={t('modal_xlsx_subtitle')}
      maxWidth={560}
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={isPending}>
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
                <Icon icon="mdi:download" width={18} />
              )
            }
          >
            {t('submit_download')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.4}>
        <ScopeIndicator />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.6}>
          <TextField
            label={t('field_startDate')}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            disabled={isPending}
          />
          <TextField
            label={t('field_endDate')}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            disabled={isPending}
            error={attempted && dateRangeInvalid}
            helperText={attempted && dateRangeInvalid ? t('help_dateRange') : undefined}
          />
        </Stack>

        <Box>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.66rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mb: 1,
            }}
          >
            {t('field_types')}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              label={t('field_types_income')}
              onClick={() => toggleType('income')}
              color={types.includes('income') ? 'success' : 'default'}
              variant={types.includes('income') ? 'filled' : 'outlined'}
              size="small"
            />
            <Chip
              label={t('field_types_expense')}
              onClick={() => toggleType('expense')}
              color={types.includes('expense') ? 'error' : 'default'}
              variant={types.includes('expense') ? 'filled' : 'outlined'}
              size="small"
            />
            {types.length === 0 && (
              <Chip label={t('field_categories_all')} size="small" sx={{ opacity: 0.6 }} />
            )}
          </Stack>
        </Box>

        <Box>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.66rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mb: 1,
            }}
          >
            {t('field_categories')}
          </Typography>
          <TextField
            select
            label={t('field_categories')}
            value=""
            onChange={(e) => toggleCategory(Number(e.target.value))}
            fullWidth
            size="small"
            disabled={isPending || categoriesQ.isLoading}
            helperText={categoryIds.length === 0 ? t('field_categories_all') : `${categoryIds.length} ${t('field_categories').toLowerCase()}`}
          >
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {categoryIds.includes(c.id) ? '✓ ' : ''}{c.name}
              </MenuItem>
            ))}
          </TextField>
          {categoryIds.length > 0 && (
            <Stack direction="row" spacing={0.6} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.6 }}>
              {categoryIds.map((id) => {
                const c = categories.find((x) => x.id === id);
                if (!c) return null;
                return (
                  <Chip
                    key={id}
                    label={c.name}
                    size="small"
                    onDelete={() => toggleCategory(id)}
                    color="primary"
                    variant="outlined"
                  />
                );
              })}
            </Stack>
          )}
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
          {t('help_dateRange')} · {t('help_scope')}
        </Typography>
      </Stack>
    </ZoomModal>
  );
}
