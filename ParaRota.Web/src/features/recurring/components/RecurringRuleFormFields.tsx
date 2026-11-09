import { useMemo } from 'react';
import { Alert, Box, FormControlLabel, InputAdornment, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { useCategoriesQuery } from '@features/categories/api/useCategories';
import type { CategoryDto, RecurringFrequency, RecurringRuleDto, TxType } from '@shared/api/types';
import { isoDate, type RecurringRuleFormState } from './useRecurringRuleFormState';

const FREQUENCIES: { value: RecurringFrequency; labelKey: string }[] = [
  { value: 'daily', labelKey: 'recurring.freqDaily' },
  { value: 'weekly', labelKey: 'recurring.freqWeekly' },
  { value: 'monthly', labelKey: 'recurring.freqMonthly' },
  { value: 'yearly', labelKey: 'recurring.freqYearly' },
];

interface Props {
  form: RecurringRuleFormState;
  set: <K extends keyof RecurringRuleFormState>(key: K, value: RecurringRuleFormState[K]) => void;
  onTypeChange: (next: TxType) => void;
  mode: 'create' | 'edit';
  rule: RecurringRuleDto | undefined;
  attempted?: boolean;
  descriptionMissing?: boolean;
  categoryMissing?: boolean;
  amountInvalid?: boolean;
}

export function RecurringRuleFormFields({
  form,
  set,
  onTypeChange,
  mode,
  rule,
  attempted = false,
  descriptionMissing = false,
  categoryMissing = false,
  amountInvalid = false,
}: Props) {
  const { t } = useTranslation(['pages', 'common']);
  const categoriesQ = useCategoriesQuery();
  const visibleCategories = useMemo<CategoryDto[]>(
    () => (categoriesQ.data ?? []).filter((c) => c.type === form.type),
    [categoriesQ.data, form.type],
  );

  return (
    <Stack spacing={2.4}>
      {mode === 'create' && <ScopeIndicator />}

      <TextField
        label={t('recurring.formDescriptionLabel')}
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        placeholder={t('recurring.formDescriptionPlaceholder')}
        fullWidth
        autoFocus
        error={attempted && descriptionMissing}
        helperText={attempted && descriptionMissing ? t('recurring.toastError') : undefined}
        inputProps={{ maxLength: 200 }}
        slotProps={{
          input: { sx: { fontFamily: '"Fraunces", serif', fontSize: '1rem', fontWeight: 500 } },
        }}
      />

      <Box>
        <FieldLabel text={t('recurring.formTypeLabel')} />
        <Stack direction="row" spacing={1.2}>
          <TypeButton
            tone="success"
            icon="mdi:trending-up"
            label={t('common:income')}
            active={form.type === 'income'}
            disabled={mode === 'edit'}
            onClick={() => onTypeChange('income')}
          />
          <TypeButton
            tone="error"
            icon="mdi:trending-down"
            label={t('common:expense')}
            active={form.type === 'expense'}
            disabled={mode === 'edit'}
            onClick={() => onTypeChange('expense')}
          />
        </Stack>
      </Box>

      <TextField
        select
        label={t('recurring.formCategoryLabel')}
        value={form.categoryId ?? ''}
        onChange={(e) => set('categoryId', Number(e.target.value))}
        fullWidth
        disabled={categoriesQ.isLoading}
        error={attempted && categoryMissing && !categoriesQ.isLoading}
        helperText={
          categoriesQ.isLoading
            ? t('common:loading')
            : attempted && categoryMissing
              ? t('recurring.toastError')
              : undefined
        }
      >
        {visibleCategories.map((c) => {
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
        label={t('recurring.formAmountLabel')}
        type="text"
        value={form.amount}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.,]/g, '');
          set('amount', v);
        }}
        fullWidth
        error={attempted && amountInvalid}
        helperText={attempted && amountInvalid ? t('recurring.toastError') : undefined}
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

      <Box>
        <FieldLabel text={t('recurring.formFrequencyLabel')} />
        <Stack direction="row" spacing={0.8} sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.8 }}>
          {FREQUENCIES.map((f) => {
            const active = form.frequency === f.value;
            return (
              <Box
                key={f.value}
                component="button"
                type="button"
                onClick={() => set('frequency', f.value)}
                sx={{
                  py: 1,
                  px: 0.5,
                  cursor: 'pointer',
                  borderRadius: 1.4,
                  border: '1.5px solid',
                  borderColor: active ? 'primary.main' : 'divider',
                  bgcolor: (th) => (active ? alpha(th.palette.primary.main, 0.1) : 'transparent'),
                  color: active ? 'primary.main' : 'text.secondary',
                  fontFamily: '"Geist", sans-serif',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  transition: 'all .15s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    color: 'primary.main',
                  },
                }}
              >
                {t(f.labelKey)}
              </Box>
            );
          })}
        </Stack>
      </Box>

      <Stack direction="row" spacing={1.2}>
        <TextField
          type="date"
          label={t('recurring.formStartDateLabel')}
          value={form.startDate}
          onChange={(e) => set('startDate', e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          type="date"
          label={t('recurring.formEndDateLabel')}
          value={form.endDate}
          onChange={(e) => set('endDate', e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>

      <Box
        sx={{
          p: 1.6,
          borderRadius: 1.5,
          border: '1px dashed',
          borderColor: 'divider',
          bgcolor: (th) => alpha(th.palette.text.primary, 0.02),
        }}
      >
        <FormControlLabel
          control={<Switch checked={form.autoApprove} onChange={(e) => set('autoApprove', e.target.checked)} />}
          label={
            <Box>
              <Typography sx={{ fontWeight: 500, fontSize: '0.92rem' }}>
                {t('recurring.autoApproveLabel')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
                {form.autoApprove ? t('recurring.autoApproveHelp_on') : t('recurring.autoApproveHelp_off')}
              </Typography>
            </Box>
          }
          sx={{ alignItems: 'flex-start', m: 0 }}
        />
      </Box>

      {mode === 'edit' && (
        <Box
          sx={{
            p: 1.4,
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: form.isActive ? 'success.main' : 'divider',
            bgcolor: (th) => (form.isActive ? alpha(th.palette.success.main, 0.06) : 'transparent'),
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
                color="success"
              />
            }
            label={
              <Typography sx={{ fontWeight: 500, fontSize: '0.92rem' }}>
                {form.isActive ? t('recurring.tabActive') : t('recurring.tabPaused')}
              </Typography>
            }
            sx={{ m: 0 }}
          />
        </Box>
      )}

      <TextField
        label={t('recurring.formNotesLabel')}
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
        fullWidth
        multiline
        minRows={2}
        inputProps={{ maxLength: 500 }}
      />

      {mode === 'edit' && rule && (
        <Alert
          severity="info"
          icon={<Icon icon="mdi:calendar-clock-outline" width={20} />}
          sx={{ '& .MuiAlert-message': { fontSize: '0.82rem' } }}
        >
          {t('recurring.nextRunLabel')}: <strong>{isoDate(rule.nextRunDate)}</strong>
        </Alert>
      )}
    </Stack>
  );
}

// --- Yardımcı sub-components ---

function FieldLabel({ text }: { text: string }) {
  return (
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
      {text}
    </Typography>
  );
}

interface TypeButtonProps {
  tone: 'success' | 'error';
  icon: string;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function TypeButton({ tone, icon, label, active, disabled, onClick }: TypeButtonProps) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        flex: 1,
        py: 1.3,
        px: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.9,
        fontFamily: '"Geist", sans-serif',
        fontWeight: 600,
        fontSize: '0.9rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: 1.5,
        border: '1.5px solid',
        borderColor: active ? `${tone}.main` : 'divider',
        bgcolor: (th) => (active ? alpha(th.palette[tone].main, 0.12) : 'transparent'),
        color: active ? `${tone}.main` : 'text.secondary',
        opacity: disabled ? 0.55 : 1,
        transition: 'all .15s',
        '&:hover': disabled
          ? {}
          : {
              borderColor: `${tone}.main`,
              color: `${tone}.main`,
              bgcolor: (th) => alpha(th.palette[tone].main, 0.06),
            },
      }}
    >
      <Icon icon={icon} width={18} />
      {label}
    </Box>
  );
}
