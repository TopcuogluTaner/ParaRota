import { useMemo } from 'react';
import { Alert, Box, InputAdornment, MenuItem, Slider, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { useCategoriesQuery } from '@features/categories/api/useCategories';
import type { BudgetFormState } from './useBudgetFormState';

const MONTH_KEYS = [
  'month_long_january',
  'month_long_february',
  'month_long_march',
  'month_long_april',
  'month_long_may',
  'month_long_june',
  'month_long_july',
  'month_long_august',
  'month_long_september',
  'month_long_october',
  'month_long_november',
  'month_long_december',
] as const;

interface Props {
  form: BudgetFormState;
  set: <K extends keyof BudgetFormState>(key: K, value: BudgetFormState[K]) => void;
  limitNum: number;
  mode: 'create' | 'edit';
  attempted: boolean;
  categoryMissing: boolean;
  limitInvalid: boolean;
}

export function BudgetFormFields({
  form,
  set,
  limitNum,
  mode,
  attempted,
  categoryMissing,
  limitInvalid,
}: Props) {
  const { t } = useTranslation(['pages', 'common']);
  const fmtMoney = useMoneyFmt(); // gizlilik modunda tutarları maskeler
  const categoriesQ = useCategoriesQuery();

  const expenseCategories = useMemo(
    () => (categoriesQ.data ?? []).filter((c) => c.type === 'expense'),
    [categoriesQ.data],
  );

  const selectedCategory = expenseCategories.find((c) => c.id === form.categoryId);
  const yearOptions = useMemo(() => {
    const cy = new Date().getFullYear();
    return [cy - 1, cy, cy + 1];
  }, []);

  return (
    <Stack spacing={2.6}>
      {mode === 'create' && <ScopeIndicator />}

      {mode === 'edit' && (
        <Alert
          severity="info"
          icon={<Icon icon="mdi:information-outline" width={20} />}
          sx={{ '& .MuiAlert-message': { fontSize: '0.85rem' } }}
        >
          {t('budgets.modalEditSubtitle')}
        </Alert>
      )}

      <TextField
        select
        label={t('budgets.formCategoryLabel')}
        value={form.categoryId ?? ''}
        onChange={(e) => set('categoryId', Number(e.target.value))}
        fullWidth
        disabled={mode === 'edit' || categoriesQ.isLoading || categoriesQ.isError}
        error={(attempted && categoryMissing && expenseCategories.length > 0) || categoriesQ.isError}
        helperText={
          categoriesQ.isLoading
            ? t('common:loading')
            : categoriesQ.isError
              ? t('categories.errorTitle')
              : expenseCategories.length === 0
                ? t('categories.emptyDescription')
                : attempted && categoryMissing
                  ? t('common:required')
                  : undefined
        }
      >
        {expenseCategories.map((c) => {
          const color = c.color ?? '#5A6E7C';
          return (
            <MenuItem key={c.id} value={c.id}>
              <Stack direction="row" spacing={1.2} alignItems="center">
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: 0.9,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: alpha(color, 0.16),
                    color,
                    fontSize: '0.9rem',
                  }}
                >
                  {c.emoji ? c.emoji : <Icon icon={c.icon} width={14} />}
                </Box>
                {c.name}
              </Stack>
            </MenuItem>
          );
        })}
      </TextField>

      <TextField
        label={t('budgets.formLimitLabel')}
        type="text"
        value={form.monthlyLimit}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.,]/g, '');
          set('monthlyLimit', v);
        }}
        fullWidth
        autoFocus={mode === 'create'}
        error={attempted && limitInvalid}
        helperText={attempted && limitInvalid ? t('common:required') : undefined}
        inputProps={{ inputMode: 'decimal' }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Typography className="pr-num" sx={{ fontWeight: 600, color: 'text.disabled' }}>
                  ₺
                </Typography>
              </InputAdornment>
            ),
            sx: { fontFamily: '"Geist Mono", monospace', fontSize: '1.2rem', fontWeight: 600 },
          },
        }}
      />

      {mode === 'create' && (
        <Stack direction="row" spacing={1.2}>
          <TextField
            select
            label={t('budgets.formMonthLabel')}
            value={form.month}
            onChange={(e) => set('month', Number(e.target.value))}
            fullWidth
          >
            {MONTH_KEYS.map((key, i) => (
              <MenuItem key={key} value={i + 1}>
                {t(`common:${key}`)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t('budgets.formYearLabel')}
            value={form.year}
            onChange={(e) => set('year', Number(e.target.value))}
            sx={{ minWidth: 120 }}
          >
            {yearOptions.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      )}

      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.66rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'text.disabled',
            }}
          >
            {t('budgets.formWarnThresholdLabel')}
          </Typography>
          <Typography
            className="pr-num"
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.95rem',
              fontWeight: 600,
              color:
                form.warnThreshold >= 90
                  ? 'error.main'
                  : form.warnThreshold >= 70
                    ? 'warning.main'
                    : 'success.main',
            }}
          >
            %{form.warnThreshold}
          </Typography>
        </Stack>
        <Slider
          value={form.warnThreshold}
          onChange={(_, v) => set('warnThreshold', Array.isArray(v) ? v[0] : v)}
          min={50}
          max={100}
          step={5}
          marks={[
            { value: 50, label: '50' },
            { value: 80, label: '80' },
            { value: 100, label: '100' },
          ]}
          sx={{
            '& .MuiSlider-markLabel': {
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.7rem',
            },
          }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
          {t('budgets.formWarnThresholdHelp')}
        </Typography>
      </Box>

      {selectedCategory && limitNum > 0 && (
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider',
            bgcolor: (th) =>
              alpha(selectedCategory.color ?? '#5A6E7C', th.palette.mode === 'dark' ? 0.06 : 0.04),
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.4,
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha(selectedCategory.color ?? '#5A6E7C', 0.18),
                color: selectedCategory.color ?? '#5A6E7C',
                fontSize: '1.1rem',
              }}
            >
              {selectedCategory.emoji ? selectedCategory.emoji : <Icon icon={selectedCategory.icon} width={20} />}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1rem' }}>
                {selectedCategory.name}
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '0.78rem',
                  color: 'text.secondary',
                }}
              >
                {fmtMoney(limitNum)} · {t('budgets.formWarnThresholdLabel').toLowerCase()} %
                {form.warnThreshold}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
