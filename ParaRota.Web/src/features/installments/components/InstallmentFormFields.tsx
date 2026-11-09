import { useMemo } from 'react';
import { Box, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { useCategoriesQuery } from '@features/categories/api/useCategories';
import { MONTH_SHORT_KEYS } from '../lib/installmentMath';
import type { CategoryDto, RecurringRuleDto } from '@shared/api/types';
import type { AmountMode, InstallmentFormState } from './useInstallmentFormState';

const QUICK_COUNTS = [2, 3, 6, 9, 12] as const;

interface Props {
  form: InstallmentFormState;
  set: <K extends keyof InstallmentFormState>(key: K, value: InstallmentFormState[K]) => void;
  mode: 'create' | 'edit';
  rule: RecurringRuleDto | null | undefined;
  /** Geçerli taksit sayısı (hook'tan türetilmiş — "Diğer" girişi öncelikli). */
  count: number;
  amountValid: boolean;
  total: number;
  monthly: number;
  lastInstallment: number;
  hasResidual: boolean;
  attempted: boolean;
  descriptionMissing: boolean;
  categoryMissing: boolean;
  countInvalid: boolean;
}

/**
 * Taksit formu alanları. Create: toplam↔aylık toggle + 2/3/6/9/12 hızlı chip'ler +
 * canlı önizleme ("6 × ₺1.666,67 · son ₺1.666,65"). Edit: plan çekirdeği kilitli
 * kutusu + yalnız açıklama/kategori/not.
 */
export function InstallmentFormFields({
  form,
  set,
  mode,
  rule,
  count,
  amountValid,
  total,
  monthly,
  lastInstallment,
  hasResidual,
  attempted,
  descriptionMissing,
  categoryMissing,
  countInvalid,
}: Props) {
  const { t } = useTranslation(['installments', 'common']);
  const fmtMoney = useMoneyFmt(); // gizlilik modunda tutarları maskeler
  const categoriesQ = useCategoriesQuery();
  const isCreate = mode === 'create';

  const expenseCategories = useMemo<CategoryDto[]>(
    () => (categoriesQ.data ?? []).filter((c) => c.type === 'expense'),
    [categoriesQ.data],
  );

  // Son taksit ayı: ilk taksit + (n−1) ay.
  const previewEnd = useMemo(() => {
    const [y, m] = form.firstDate.split('-').map(Number);
    if (!y || !m) return null;
    const d = new Date(y, m - 1 + count - 1, 1);
    return `${t(`common:${MONTH_SHORT_KEYS[d.getMonth()]}`)} ${d.getFullYear()}`;
  }, [form.firstDate, count, t]);

  return (
    <Stack spacing={2.4}>
      {isCreate && <ScopeIndicator />}

      <TextField
        label={t('form_descriptionLabel')}
        placeholder={t('form_descriptionPlaceholder')}
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        fullWidth
        autoFocus
        error={attempted && descriptionMissing}
        helperText={attempted && descriptionMissing ? t('common:required') : undefined}
        inputProps={{ maxLength: 200 }}
        slotProps={{
          input: { sx: { fontFamily: '"Fraunces", serif', fontSize: '1rem', fontWeight: 500 } },
        }}
      />

      {isCreate ? (
        <>
          {/* Toplam ↔ Aylık: kullanıcı hangisini biliyorsa onu girer, diğerini biz hesaplarız */}
          <Box>
            <FieldLabel text={t('form_amountModeLabel')} />
            <Stack direction="row" spacing={1.2}>
              {(['total', 'monthly'] as AmountMode[]).map((m) => (
                <ModeButton
                  key={m}
                  label={t(m === 'total' ? 'amountMode_total' : 'amountMode_monthly')}
                  icon={m === 'total' ? 'mdi:sigma' : 'mdi:calendar-month-outline'}
                  active={form.amountMode === m}
                  onClick={() => set('amountMode', m)}
                />
              ))}
            </Stack>
          </Box>

          <TextField
            label={form.amountMode === 'total' ? t('form_totalLabel') : t('form_monthlyLabel')}
            type="text"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value.replace(/[^0-9.,]/g, ''))}
            fullWidth
            error={attempted && !amountValid}
            helperText={attempted && !amountValid ? t('common:required') : undefined}
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

          {/* Taksit sayısı: hızlı chip'ler + serbest giriş */}
          <Box>
            <FieldLabel text={t('form_countLabel')} />
            <Stack direction="row" alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.9 }}>
              {QUICK_COUNTS.map((c) => {
                const active = form.count === c && form.countInput === '';
                return (
                  <Box
                    key={c}
                    component="button"
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      set('countInput', '');
                      set('count', c);
                    }}
                    sx={{
                      px: 2,
                      py: 0.9,
                      cursor: 'pointer',
                      borderRadius: 99,
                      border: '1.5px solid',
                      borderColor: active ? 'primary.main' : 'divider',
                      bgcolor: (th) => (active ? alpha(th.palette.primary.main, 0.1) : 'transparent'),
                      color: active ? 'primary.main' : 'text.secondary',
                      fontFamily: '"Geist Mono", monospace',
                      fontWeight: 600,
                      fontSize: '0.86rem',
                      transition: 'all .15s',
                      '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                    }}
                  >
                    {c}
                  </Box>
                );
              })}
              <TextField
                size="small"
                placeholder={t('form_countOther')}
                value={form.countInput}
                onChange={(e) => {
                  // Geçerli sayı hook'ta countInput'tan türetilir — aralık dışı değer
                  // eski chip değerine sessizce düşmez, countInvalid ile engellenir.
                  set('countInput', e.target.value.replace(/[^0-9]/g, '').slice(0, 3));
                }}
                error={(attempted || form.countInput !== '') && countInvalid}
                inputProps={{ inputMode: 'numeric', 'aria-label': t('form_countOther') }}
                sx={{ width: 96, '& .MuiInputBase-input': { fontFamily: '"Geist Mono", monospace' } }}
              />
            </Stack>
          </Box>

          <TextField
            type="date"
            label={t('form_firstDateLabel')}
            value={form.firstDate}
            onChange={(e) => set('firstDate', e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </>
      ) : (
        // Düzenlemede plan çekirdeği kilitli — kullanıcıya neden değiştiremediğini söyle.
        rule && (
          <Stack
            direction="row"
            spacing={1.4}
            alignItems="center"
            sx={{
              p: 1.6,
              borderRadius: 1.5,
              border: '1px dashed',
              borderColor: 'divider',
              bgcolor: (th) => alpha(th.palette.text.primary, 0.02),
            }}
          >
            <Box sx={{ color: 'text.disabled', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Icon icon="mdi:lock-outline" width={16} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography className="pr-num" sx={{ fontWeight: 600, fontSize: '0.92rem' }}>
                {rule.installmentCount} × {fmtMoney(rule.amount, rule.currency)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0, lineHeight: 1.4, display: 'block' }}>
                {t('locked_hint')}
              </Typography>
            </Box>
          </Stack>
        )
      )}

      <TextField
        select
        label={t('form_categoryLabel')}
        value={form.categoryId ?? ''}
        onChange={(e) => set('categoryId', Number(e.target.value))}
        fullWidth
        disabled={categoriesQ.isLoading}
        error={attempted && categoryMissing && !categoriesQ.isLoading}
        helperText={
          categoriesQ.isLoading
            ? t('common:loading')
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
        label={t('form_notesLabel')}
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
        fullWidth
        multiline
        minRows={2}
        inputProps={{ maxLength: 500 }}
      />

      {/* Canlı önizleme: "6 × ₺1.666,67 = ₺10.000 · son taksit ₺1.666,65 · Eyl 2026".
          Sayı geçersizken (Diğer aralık dışı) gizlenir — yanıltıcı çarpan göstermesin. */}
      {isCreate && amountValid && !countInvalid && (
        <Box
          sx={{
            p: 1.8,
            borderRadius: 1.8,
            border: '1px solid',
            borderColor: (th) => alpha(th.palette.success.main, 0.3),
            bgcolor: (th) => alpha(th.palette.success.main, th.palette.mode === 'dark' ? 0.1 : 0.06),
          }}
        >
          <Stack direction="row" spacing={0.8} alignItems="center" sx={{ color: 'success.main' }}>
            <Icon icon="mdi:credit-card-clock-outline" width={15} />
            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'success.main',
                fontWeight: 600,
              }}
            >
              {t('preview_eyebrow')}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.8} alignItems="baseline" sx={{ mt: 0.9, flexWrap: 'wrap' }}>
            <Typography
              className="pr-num"
              sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 600, fontSize: '1.05rem', color: 'success.main' }}
            >
              {count} × {fmtMoney(monthly)}
            </Typography>
            <Typography className="pr-num" variant="body2" sx={{ color: 'text.secondary' }}>
              = {fmtMoney(total)}
            </Typography>
          </Stack>
          {hasResidual && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.4, color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
              {t('preview_residual', { amount: fmtMoney(lastInstallment) })}
            </Typography>
          )}
          {previewEnd && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.2, color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
              {t('preview_ends', { date: previewEnd })}
            </Typography>
          )}
        </Box>
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

interface ModeButtonProps {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}

function ModeButton({ label, icon, active, onClick }: ModeButtonProps) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-pressed={active}
      sx={{
        flex: 1,
        py: 1.2,
        px: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.9,
        fontFamily: '"Geist", sans-serif',
        fontWeight: 600,
        fontSize: '0.88rem',
        cursor: 'pointer',
        borderRadius: 1.5,
        border: '1.5px solid',
        borderColor: active ? 'primary.main' : 'divider',
        bgcolor: (th) => (active ? alpha(th.palette.primary.main, 0.1) : 'transparent'),
        color: active ? 'primary.main' : 'text.secondary',
        transition: 'all .15s',
        '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
      }}
    >
      <Icon icon={icon} width={17} />
      {label}
    </Box>
  );
}
