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
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { SectionHeader } from '@shared/components/SectionHeader';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { EmptyState } from '@shared/components/EmptyState';
import { parseAmount } from '@shared/lib/parseAmount';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useRentIncreaseQuery, type RentIncreaseParams } from '../api/useRentIncrease';
import { RentResultCard } from '../components/RentResultCard';

const MONTH_SHORT = [
  'month_short_jan', 'month_short_feb', 'month_short_mar', 'month_short_apr',
  'month_short_may', 'month_short_jun', 'month_short_jul', 'month_short_aug',
  'month_short_sep', 'month_short_oct', 'month_short_nov', 'month_short_dec',
] as const;

/**
 * Kira Artışı hesaplayıcı (TBK m.344) — durumsuz yardımcı sayfa, scope göstergesi yok.
 * Mevcut kira + yenileme ayı/yılı → yasal azami artış (TÜFE 12 aylık ortalama).
 * İlk hesaptan sonra ay/yıl chip'leri canlı kontrole dönüşür: tıkla → sonuç anında
 * yeni döneme göre tazelenir (tekrar "Hesapla" istemek gereksiz sürtünme olurdu).
 */
export function RentIncreasePage() {
  const { t } = useTranslation('rent');
  const { t: tCommon } = useTranslation('common');

  // Varsayılan yenileme = gelecek ay (sözleşmeler genelde ileri tarihte yenilenir).
  const now = new Date();
  const defaultMonth = now.getMonth() + 2; // 1-bazlı gelecek ay
  const [rentInput, setRentInput] = useState('');
  const [month, setMonth] = useState(defaultMonth > 12 ? 1 : defaultMonth);
  const [year, setYear] = useState(defaultMonth > 12 ? now.getFullYear() + 1 : now.getFullYear());
  const [params, setParams] = useState<RentIncreaseParams | null>(null);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const { data, isFetching, isError, error, refetch } = useRentIncreaseQuery(params);

  const rentValue = parseAmount(rentInput);
  const rentValid = Number.isFinite(rentValue) && rentValue > 0;

  const compute = () => {
    if (rentValid) setParams({ rent: rentValue, month, year });
  };

  const selectMonth = (m: number) => {
    setMonth(m);
    if (params) setParams({ ...params, month: m });
  };
  const selectYear = (y: number) => {
    setYear(y);
    if (params) setParams({ ...params, year: y });
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 2.6, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('page_eyebrow')}
        title={t('page_title')}
        description={t('page_description')}
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 3 }} alignItems="flex-start">
          {/* Giriş kartı */}
          <SurfaceCard edge sx={{ width: { xs: '100%', md: 400 }, flexShrink: 0, pt: 3.2 }}>
            <TextField
              fullWidth
              label={t('rentLabel')}
              value={rentInput}
              onChange={(e) => setRentInput(e.target.value.replace(/[^\d.,]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') compute();
              }}
              placeholder={t('rentPlaceholder')}
              slotProps={{
                htmlInput: { inputMode: 'decimal', 'aria-label': t('rentLabel') },
                input: {
                  startAdornment: <InputAdornment position="start">₺</InputAdornment>,
                  sx: { fontWeight: 700, fontSize: '1.05rem' },
                },
              }}
            />

            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.68rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mt: 2.4,
                mb: 1,
              }}
            >
              {t('renewalLabel')}
            </Typography>
            <Box
              role="group"
              aria-label={t('renewalLabel')}
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}
            >
              {MONTH_SHORT.map((key, i) => {
                const on = month === i + 1;
                return (
                  <ButtonBase
                    key={key}
                    onClick={() => selectMonth(i + 1)}
                    aria-pressed={on}
                    sx={{
                      px: 1.4,
                      py: 0.7,
                      borderRadius: 999,
                      border: '1px solid',
                      borderColor: on ? 'success.main' : 'divider',
                      bgcolor: on ? (th) => alpha(th.palette.success.main, 0.12) : 'transparent',
                      color: on ? 'success.main' : 'text.secondary',
                      fontSize: '0.78rem',
                      fontWeight: on ? 700 : 500,
                      fontFamily: 'inherit',
                      transition: 'all .15s',
                      '&:hover': { borderColor: 'success.main' },
                    }}
                  >
                    {tCommon(key)}
                  </ButtonBase>
                );
              })}
            </Box>

            <Box
              role="group"
              aria-label={t('yearLabel')}
              sx={{
                display: 'flex',
                mt: 1.6,
                p: 0.4,
                borderRadius: 999,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
              }}
            >
              {years.map((y) => {
                const on = year === y;
                return (
                  <ButtonBase
                    key={y}
                    onClick={() => selectYear(y)}
                    aria-pressed={on}
                    className="pr-num"
                    sx={{
                      flex: 1,
                      py: 0.9,
                      borderRadius: 999,
                      fontSize: '0.84rem',
                      fontWeight: on ? 700 : 500,
                      fontFamily: 'inherit',
                      bgcolor: on ? 'text.primary' : 'transparent',
                      color: on ? 'background.paper' : 'text.secondary',
                      transition: 'all .15s',
                    }}
                  >
                    {y}
                  </ButtonBase>
                );
              })}
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={compute}
              disabled={!rentValid}
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
              <EmptyState icon="mdi:home-percent-outline" title={t('emptyTitle')} description={t('emptyHint')} />
            ) : isFetching && !data ? (
              <SurfaceCard padding={0} sx={{ overflow: 'hidden' }}>
                <Box sx={{ p: { xs: 2.2, sm: 2.8 } }}>
                  <Skeleton variant="text" width="45%" height={20} />
                  <Skeleton variant="text" width="65%" height={56} />
                </Box>
                <Box sx={{ px: { xs: 2.2, sm: 2.8 }, pb: 2.4, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                  <Skeleton variant="rounded" height={8} sx={{ borderRadius: 999, mb: 1.6 }} />
                  <Skeleton variant="text" width="80%" height={24} />
                  <Skeleton variant="text" width="70%" height={24} />
                  <Skeleton variant="text" width="75%" height={24} />
                </Box>
              </SurfaceCard>
            ) : isError && !data ? (
              <EmptyState
                icon="mdi:alert-circle-outline"
                title={t('error_title')}
                description={getErrorMessage(error, t('error_title'))}
                action={
                  <Button
                    variant="contained"
                    onClick={() => void refetch()}
                    startIcon={<Icon icon="mdi:refresh" width={18} />}
                  >
                    {t('error_retry')}
                  </Button>
                }
              />
            ) : data ? (
              <RentResultCard
                key={`res-${data.referenceMonth}-${data.referenceYear}-${data.currentRent}`}
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
