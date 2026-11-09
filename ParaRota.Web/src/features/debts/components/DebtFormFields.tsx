import { Box, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { Money } from '@shared/components/Money';
import { parseAmount } from '@shared/lib/parseAmount';
import { CURRENCY_CODES } from '@shared/constants/currencies';
import type { DebtFrequency, DebtKind, PaymentMode } from '@shared/api/types/debts';
import type { DebtFormState } from './useDebtFormState';

interface Props {
  form: DebtFormState;
  set: <K extends keyof DebtFormState>(key: K, value: DebtFormState[K]) => void;
  installmentNum: number | undefined;
  mode: 'create' | 'edit';
  attempted?: boolean;
  titleMissing?: boolean;
  counterpartyMissing?: boolean;
  amountInvalid?: boolean;
}

export function DebtFormFields({
  form,
  set,
  installmentNum,
  mode,
  attempted = false,
  titleMissing = false,
  counterpartyMissing = false,
  amountInvalid = false,
}: Props) {
  const { t } = useTranslation(['debts', 'common']);
  const isCreate = mode === 'create';

  // Düz (basit) faiz önizlemesi: Anapara × (1 + oran/100) = faiz dahil toplam.
  // Backend de oluştururken aynısını uygular; burada kullanıcıya canlı kırılım gösterilir.
  const principalNum = parseAmount(form.amount);
  const rateNum = parseFloat(form.interestRate) || 0;
  const hasPrincipal = !Number.isNaN(principalNum) && principalNum > 0;
  const totalWithInterest = hasPrincipal
    ? Math.round(principalNum * (1 + rateNum / 100) * 100) / 100
    : 0;
  const countNum = parseInt(form.installmentCount, 10);
  const hasInstallments = !Number.isNaN(countNum) && countNum > 0;
  // BE recurring kuralı taksiti 2 haneye yuvarlar (Amount/count); önizleme de aynı yuvarlasın.
  const perInstallment = hasInstallments ? Math.round((totalWithInterest / countNum) * 100) / 100 : 0;
  const showInterestPreview = isCreate && hasPrincipal && (rateNum > 0 || hasInstallments);

  return (
    <Stack spacing={2.4}>
      {isCreate && <ScopeIndicator />}

      {isCreate && (
        <Box>
          <FieldLabel text={t('form_kindLabel')} />
          <Stack direction="row" spacing={1.2}>
            <KindButton
              tone="error"
              icon="mdi:credit-card-clock-outline"
              label={t('kind_payable')}
              selected={form.kind === 'payable'}
              onClick={() => set('kind', 'payable')}
            />
            <KindButton
              tone="success"
              icon="mdi:hand-coin-outline"
              label={t('kind_receivable')}
              selected={form.kind === 'receivable'}
              onClick={() => set('kind', 'receivable')}
            />
          </Stack>
        </Box>
      )}

      <TextField
        label={t('form_titleLabel')}
        placeholder={t('form_titlePlaceholder')}
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
        fullWidth
        autoFocus
        error={attempted && titleMissing}
        helperText={attempted && titleMissing ? t('common:required') : undefined}
        inputProps={{ maxLength: 120 }}
      />

      <TextField
        label={t('form_counterpartyLabel')}
        placeholder={t('form_counterpartyPlaceholder')}
        value={form.counterpartyName}
        onChange={(e) => set('counterpartyName', e.target.value)}
        fullWidth
        error={attempted && counterpartyMissing}
        helperText={attempted && counterpartyMissing ? t('common:required') : undefined}
        inputProps={{ maxLength: 120 }}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.6}>
        <TextField
          label={t('form_amountLabel')}
          type="text"
          value={form.amount}
          onChange={(e) => set('amount', e.target.value)}
          disabled={!isCreate}
          fullWidth
          error={attempted && amountInvalid && isCreate}
          helperText={attempted && amountInvalid && isCreate ? t('common:required') : undefined}
          inputProps={{ inputMode: 'decimal' }}
        />
        <TextField
          select
          label={t('form_currencyLabel')}
          value={form.currency}
          onChange={(e) => set('currency', e.target.value)}
          disabled={!isCreate}
          sx={{ minWidth: 110 }}
        >
          {CURRENCY_CODES.map((c) => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.6}>
        <TextField
          label={t('form_startDateLabel')}
          type="date"
          value={form.startDate}
          onChange={(e) => set('startDate', e.target.value)}
          disabled={!isCreate}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label={t('form_dueDateLabel')}
          type="date"
          value={form.dueDate}
          onChange={(e) => set('dueDate', e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </Stack>

      <TextField
        label={t('form_interestRateLabel')}
        type="number"
        value={form.interestRate}
        onChange={(e) => set('interestRate', e.target.value)}
        disabled={!isCreate}
        fullWidth
        inputProps={{ min: 0, max: 100, step: '0.1' }}
        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
      />

      {isCreate && (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.6}>
            <TextField
              label={t('form_installmentCountLabel')}
              type="number"
              value={form.installmentCount}
              onChange={(e) => set('installmentCount', e.target.value)}
              fullWidth
              inputProps={{ min: 1, max: 360, step: 1 }}
            />
            <TextField
              select
              label={t('form_installmentFrequencyLabel')}
              value={form.installmentFrequency}
              onChange={(e) => set('installmentFrequency', e.target.value as DebtFrequency)}
              disabled={!form.installmentCount}
              fullWidth
            >
              <MenuItem value="monthly">{t('freq_monthly')}</MenuItem>
              <MenuItem value="weekly">{t('freq_weekly')}</MenuItem>
              <MenuItem value="biweekly">{t('freq_biweekly')}</MenuItem>
              <MenuItem value="yearly">{t('freq_yearly')}</MenuItem>
            </TextField>
          </Stack>

          {showInterestPreview && (
            <Box
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
                px: 1.8,
                py: 1.4,
              }}
            >
              {rateNum > 0 && (
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" sx={{ textTransform: 'none', letterSpacing: 0, color: 'text.secondary' }}>
                    {t('form_totalWithInterest')}
                  </Typography>
                  <Money value={totalWithInterest} currency={form.currency} size="md" weight={600} />
                </Stack>
              )}
              {hasInstallments && (
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mt: rateNum > 0 ? 0.8 : 0 }}
                >
                  <Typography variant="caption" sx={{ textTransform: 'none', letterSpacing: 0, color: 'text.disabled' }}>
                    {countNum} ×
                  </Typography>
                  <Money value={perInstallment} currency={form.currency} size="sm" weight={600} tone="mute" />
                </Stack>
              )}
            </Box>
          )}

          <Box>
            <FieldLabel text={t('form_paymentModeLabel')} />
            <Stack direction="row" spacing={1.2}>
              <PaymentModeButton
                icon="mdi:autorenew"
                label={t('paymentMode_auto')}
                hint={t('paymentMode_auto_hint')}
                selected={form.paymentMode === 'auto'}
                onClick={() => set('paymentMode', 'auto')}
                disabled={!installmentNum}
              />
              <PaymentModeButton
                icon="mdi:gesture-tap"
                label={t('paymentMode_manual')}
                hint={t('paymentMode_manual_hint')}
                selected={form.paymentMode === 'manual'}
                onClick={() => set('paymentMode', 'manual')}
              />
            </Stack>
          </Box>
        </>
      )}

      <TextField
        label={t('form_descriptionLabel')}
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        multiline
        minRows={2}
        maxRows={4}
        fullWidth
        inputProps={{ maxLength: 500 }}
      />
    </Stack>
  );
}

// --- Yardımcı sub-components ---

function FieldLabel({ text }: { text: string }) {
  return (
    <Typography
      sx={{
        fontFamily: '"Geist Mono", monospace',
        fontSize: '0.62rem',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'text.disabled',
        mb: 1,
      }}
    >
      {text}
    </Typography>
  );
}

interface KindButtonProps {
  tone: 'error' | 'success';
  icon: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

function KindButton({ tone, icon, label, selected, onClick }: KindButtonProps) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        all: 'unset',
        cursor: 'pointer',
        flex: 1,
        px: 1.8,
        py: 1.4,
        borderRadius: 1.4,
        border: '1.5px solid',
        borderColor: selected ? `${tone}.main` : 'divider',
        bgcolor: (th) =>
          selected ? alpha(th.palette[tone].main, th.palette.mode === 'dark' ? 0.14 : 0.08) : 'transparent',
        color: selected ? `${tone}.main` : 'text.secondary',
        display: 'flex',
        alignItems: 'center',
        gap: 1.2,
        transition: 'all .15s',
        '&:hover': { borderColor: `${tone}.main` },
      }}
    >
      <Icon icon={icon} width={20} />
      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</Typography>
    </Box>
  );
}

interface PaymentModeButtonProps {
  icon: string;
  label: string;
  hint: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function PaymentModeButton({ icon, label, hint, selected, onClick, disabled }: PaymentModeButtonProps) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        all: 'unset',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        flex: 1,
        px: 1.6,
        py: 1.2,
        borderRadius: 1.4,
        border: '1.5px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: (th) =>
          selected ? alpha(th.palette.primary.main, th.palette.mode === 'dark' ? 0.14 : 0.06) : 'transparent',
        color: selected ? 'primary.main' : 'text.secondary',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        transition: 'all .15s',
        '&:hover': disabled ? {} : { borderColor: 'primary.main' },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Icon icon={icon} width={18} />
        <Typography sx={{ fontWeight: 600, fontSize: '0.86rem' }}>{label}</Typography>
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'none', letterSpacing: 0, lineHeight: 1.35 }}>
        {hint}
      </Typography>
    </Box>
  );
}

// Unused type imports kept for clarity (consumer of this module pulls these elsewhere)
export type { DebtKind, PaymentMode };
