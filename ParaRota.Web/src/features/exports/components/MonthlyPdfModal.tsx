import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useMonthlyPdfMutation } from '../api/useExports';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Layout = 'combined' | 'perMonth';

// common namespace'teki kısa ay anahtarları — 1..12 sıralı.
const MONTH_SHORT_KEYS = [
  'month_short_jan', 'month_short_feb', 'month_short_mar', 'month_short_apr',
  'month_short_may', 'month_short_jun', 'month_short_jul', 'month_short_aug',
  'month_short_sep', 'month_short_oct', 'month_short_nov', 'month_short_dec',
] as const;

const EYEBROW_SX = {
  fontFamily: '"Geist Mono", monospace',
  fontSize: '0.66rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'text.disabled',
} as const;

export function MonthlyPdfModal({ open, onClose }: Props) {
  const { t } = useTranslation(['exports', 'common']);
  const now = new Date();
  const [months, setMonths] = useState<number[]>([now.getMonth() + 1]);
  const [year, setYear] = useState(now.getFullYear());
  const [layout, setLayout] = useState<Layout>('combined');
  const [includeTransactions, setIncludeTransactions] = useState(true);
  // İlk başarısız "İndir" denemesinden sonra eksik ay seçimini uyarıyla göster.
  const [attempted, setAttempted] = useState(false);

  const mutation = useMonthlyPdfMutation();
  const isPending = mutation.isPending;

  const yearOptions = (() => {
    const cy = new Date().getFullYear();
    return [cy - 2, cy - 1, cy, cy + 1];
  })();

  const toggleMonth = (m: number) => {
    setMonths((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)));
  };
  const selectAll = () => setMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const clearMonths = () => setMonths([]);

  const multiMonth = months.length > 1;
  const canSubmit = months.length > 0;

  const handleSubmit = async () => {
    if (isPending) return;
    // Ay seçilmediyse: tıklamayı engelleme — net uyarı + alan hatası göster.
    if (!canSubmit) {
      setAttempted(true);
      toast.error(t('toast_error'), { id: 'monthly-pdf-validate' });
      return;
    }
    try {
      await mutation.mutateAsync({
        months: [...months].sort((a, b) => a - b),
        year,
        includeTransactions,
        // tek ay seçiliyse düzen önemsiz; combined gönder.
        layout: multiMonth ? layout : 'combined',
      });
      toast.success(t('toast_pdfReady'));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, t('toast_error')));
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={() => !isPending && onClose()}
      icon="mdi:file-pdf-box"
      title={t('modal_monthlyPdf_title')}
      subtitle={t('modal_monthlyPdf_subtitle')}
      maxWidth={500}
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
      <Stack spacing={2.6}>
        <ScopeIndicator />

        {/* Aylar (çoklu seçim) + yıl */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
            <Typography sx={EYEBROW_SX}>{t('field_months')}</Typography>
            <Stack direction="row" spacing={1.5}>
              <Box
                component="button"
                type="button"
                onClick={selectAll}
                disabled={isPending}
                sx={linkBtnSx}
              >
                {t('field_selectAll')}
              </Box>
              <Box
                component="button"
                type="button"
                onClick={clearMonths}
                disabled={isPending || months.length === 0}
                sx={linkBtnSx}
              >
                {t('field_clear')}
              </Box>
            </Stack>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 0.8,
            }}
          >
            {MONTH_SHORT_KEYS.map((key, i) => {
              const m = i + 1;
              const active = months.includes(m);
              return (
                <Chip
                  key={key}
                  label={t(`common:${key}`)}
                  onClick={() => toggleMonth(m)}
                  disabled={isPending}
                  color={active ? 'primary' : 'default'}
                  variant={active ? 'filled' : 'outlined'}
                  size="small"
                  sx={{ width: '100%', borderRadius: 1.5, fontWeight: active ? 600 : 400 }}
                />
              );
            })}
          </Box>

          {attempted && !canSubmit && (
            <Typography
              variant="caption"
              sx={{ color: 'error.main', textTransform: 'none', letterSpacing: 0, mt: 0.8, display: 'block' }}
            >
              {t('toast_error')}
            </Typography>
          )}

          <TextField
            select
            label={t('field_year')}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            size="small"
            sx={{ mt: 1.6, minWidth: 130 }}
            disabled={isPending}
          >
            {yearOptions.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Çok aylı düzen — yalnız >1 ay seçiliyken anlamlı */}
        {multiMonth && (
          <Box>
            <Typography sx={{ ...EYEBROW_SX, mb: 1 }}>{t('field_layout')}</Typography>
            <ToggleButtonGroup
              value={layout}
              exclusive
              onChange={(_, v: Layout | null) => v && setLayout(v)}
              size="small"
              fullWidth
              disabled={isPending}
            >
              <ToggleButton value="combined" sx={{ textTransform: 'none', gap: 0.6 }}>
                <Icon icon="mdi:layers" width={16} />
                {t('layout_combined')}
              </ToggleButton>
              <ToggleButton value="perMonth" sx={{ textTransform: 'none', gap: 0.6 }}>
                <Icon icon="mdi:view-agenda-outline" width={16} />
                {t('layout_perMonth')}
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0, mt: 0.8, display: 'block' }}>
              {layout === 'combined' ? t('help_layout_combined') : t('help_layout_perMonth')}
            </Typography>
          </Box>
        )}

        {/* İşlem detayları opsiyonel — harcama tek kalem, altındaki tablo isteğe bağlı */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{
            p: 1.6,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: (th) => (th.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'),
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {t('field_includeTransactions')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
              {t('help_includeTransactions')}
            </Typography>
          </Box>
          <Switch
            checked={includeTransactions}
            onChange={(e) => setIncludeTransactions(e.target.checked)}
            color="primary"
            disabled={isPending}
          />
        </Stack>

        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
          {t('help_monthSelector')} · {t('help_scope')}
        </Typography>
      </Stack>
    </ZoomModal>
  );
}

const linkBtnSx = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  p: 0,
  fontFamily: '"Geist Mono", monospace',
  fontSize: '0.62rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'primary.main',
  '&:hover': { textDecoration: 'underline' },
  '&:disabled': { color: 'text.disabled', cursor: 'default', textDecoration: 'none' },
} as const;
