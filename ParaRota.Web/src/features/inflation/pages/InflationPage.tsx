import { useState } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { SectionHeader } from '@shared/components/SectionHeader';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { EmptyState } from '@shared/components/EmptyState';
import { parseAmount } from '@shared/lib/parseAmount';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useInflationQuery, type InflationParams } from '../api/useInflation';
import { InflationResultCard } from '../components/InflationResultCard';
import { MonthYearSelector } from '../components/MonthYearSelector';

const MIN_YEAR = 2003;

/**
 * Paranın Değeri — TÜFE bazlı enflasyon hesaplayıcı. Bir tutarın geçmiş bir aydan
 * bugüne (ya da seçilen bir aya) alım gücü eşdeğerini gösterir. Çift yönlü.
 * İlk hesaptan sonra tüm seçiciler canlı kontrole döner: değiştir → sonuç anında tazelenir.
 */
export function InflationPage() {
  const { t } = useTranslation('inflation');
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  const [amountInput, setAmountInput] = useState('');
  const [fromMonth, setFromMonth] = useState(1);
  const [fromYear, setFromYear] = useState(curYear - 10);
  const [toMode, setToMode] = useState<'today' | 'custom'>('today');
  const [toMonth, setToMonth] = useState(curMonth);
  const [toYear, setToYear] = useState(curYear);
  const [params, setParams] = useState<InflationParams | null>(null);

  const { data, isFetching, isError, error, refetch } = useInflationQuery(params);

  const amountValue = parseAmount(amountInput);
  const amountValid = Number.isFinite(amountValue) && amountValue > 0;

  const buildParams = (over?: Partial<InflationParams>): InflationParams => ({
    amount: amountValue,
    fromMonth,
    fromYear,
    toMonth: toMode === 'today' ? null : toMonth,
    toYear: toMode === 'today' ? null : toYear,
    ...over,
  });

  const compute = () => {
    if (amountValid) setParams(buildParams());
  };
  // Canlı kontrol: hesap yapıldıysa seçim değişince params güncellenir.
  const live = (over: Partial<InflationParams>) => {
    if (params) setParams({ ...params, ...over });
  };

  const setFM = (m: number) => { setFromMonth(m); live({ fromMonth: m }); };
  const setFY = (y: number) => { setFromYear(y); live({ fromYear: y }); };
  const setTM = (m: number) => { setToMonth(m); live({ toMonth: m }); };
  const setTY = (y: number) => { setToYear(y); live({ toYear: y }); };
  const setMode = (mode: 'today' | 'custom') => {
    setToMode(mode);
    live(mode === 'today' ? { toMonth: null, toYear: null } : { toMonth, toYear });
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 2.6, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
      <SectionHeader eyebrow={t('page_eyebrow')} title={t('page_title')} description={t('page_description')} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 3 }} alignItems="flex-start">
          {/* Giriş kartı */}
          <SurfaceCard edge sx={{ width: { xs: '100%', md: 400 }, flexShrink: 0, pt: 3.2 }}>
            <TextField
              fullWidth
              label={t('amountLabel')}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value.replace(/[^\d.,]/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') compute(); }}
              placeholder={t('amountPlaceholder')}
              slotProps={{
                htmlInput: { inputMode: 'decimal', 'aria-label': t('amountLabel') },
                input: {
                  startAdornment: <InputAdornment position="start">₺</InputAdornment>,
                  sx: { fontWeight: 700, fontSize: '1.05rem' },
                },
              }}
            />

            <MonthYearSelector
              label={t('fromLabel')}
              month={fromMonth}
              year={fromYear}
              minYear={MIN_YEAR}
              maxYear={curYear}
              onMonth={setFM}
              onYear={setFY}
            />

            {/* Bitiş: Bugün / Özel tarih */}
            <Typography sx={{ ...eyebrowLabel, mt: 2.4, mb: 1 }}>{t('toLabel')}</Typography>
            <Box
              role="group"
              aria-label={t('toLabel')}
              sx={{ display: 'flex', p: 0.4, borderRadius: 999, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}
            >
              {(['today', 'custom'] as const).map((mode) => {
                const on = toMode === mode;
                return (
                  <ButtonBase
                    key={mode}
                    onClick={() => setMode(mode)}
                    aria-pressed={on}
                    sx={{
                      flex: 1, py: 0.9, borderRadius: 999, fontSize: '0.84rem',
                      fontWeight: on ? 700 : 500, fontFamily: 'inherit',
                      bgcolor: on ? 'text.primary' : 'transparent',
                      color: on ? 'background.paper' : 'text.secondary',
                      transition: 'all .15s',
                    }}
                  >
                    {t(mode === 'today' ? 'toToday' : 'toCustom')}
                  </ButtonBase>
                );
              })}
            </Box>

            {toMode === 'custom' && (
              <MonthYearSelector
                a11yLabel={t('toCustom')}
                month={toMonth}
                year={toYear}
                minYear={MIN_YEAR}
                maxYear={curYear}
                onMonth={setTM}
                onYear={setTY}
              />
            )}

            <Button
              fullWidth
              variant="contained"
              onClick={compute}
              disabled={!amountValid}
              startIcon={<Icon icon="mdi:calculator-variant-outline" width={18} />}
              sx={{ mt: 2.4, py: 1.1, borderRadius: 999, fontWeight: 700 }}
            >
              {t('calculate')}
            </Button>

            {params != null && (
              <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 1.4, color: 'text.disabled' }}>
                <Icon icon="mdi:cursor-default-click-outline" width={14} />
                <Typography sx={{ fontSize: '0.74rem' }}>{t('liveHint')}</Typography>
              </Stack>
            )}
          </SurfaceCard>

          {/* Sonuç alanı */}
          <Box sx={{ flex: 1, width: '100%', minWidth: 0 }}>
            {params == null ? (
              <EmptyState icon="mdi:cash-clock" title={t('emptyTitle')} description={t('emptyHint')} />
            ) : isFetching && !data ? (
              <SurfaceCard padding={0} sx={{ overflow: 'hidden' }}>
                <Box sx={{ p: { xs: 2.2, sm: 2.8 } }}>
                  <Skeleton variant="text" width="45%" height={20} />
                  <Skeleton variant="text" width="65%" height={56} />
                </Box>
                <Box sx={{ px: { xs: 2.2, sm: 2.8 }, pb: 2.4, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                  <Skeleton variant="rounded" height={96} sx={{ borderRadius: 2, mb: 1.6 }} />
                  <Skeleton variant="text" width="80%" height={24} />
                  <Skeleton variant="text" width="70%" height={24} />
                </Box>
              </SurfaceCard>
            ) : isError && !data ? (
              <EmptyState
                icon="mdi:alert-circle-outline"
                title={t('error_title')}
                description={getErrorMessage(error, t('error_title'))}
                action={
                  <Button variant="contained" onClick={() => void refetch()} startIcon={<Icon icon="mdi:refresh" width={18} />}>
                    {t('error_retry')}
                  </Button>
                }
              />
            ) : data ? (
              <InflationResultCard
                key={`res-${data.fromMonth}-${data.fromYear}-${data.effectiveToMonth}-${data.effectiveToYear}-${data.amount}`}
                data={data}
                isFetching={isFetching}
              />
            ) : null}
          </Box>
        </Stack>
      </motion.div>
    </Box>
  );
}

const eyebrowLabel = {
  fontFamily: '"Geist Mono", monospace',
  fontSize: '0.68rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: 'text.disabled',
};
