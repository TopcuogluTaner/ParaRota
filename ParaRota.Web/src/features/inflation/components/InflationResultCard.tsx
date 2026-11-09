import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'motion/react';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { Money } from '@shared/components/Money';
import { formatNumber } from '@shared/lib/dateFormat';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import type { InflationConvertResultDto } from '@shared/api/types';
import { PurchasingPowerChart } from './PurchasingPowerChart';

const MONTH_LONG = [
  'month_long_january', 'month_long_february', 'month_long_march', 'month_long_april',
  'month_long_may', 'month_long_june', 'month_long_july', 'month_long_august',
  'month_long_september', 'month_long_october', 'month_long_november', 'month_long_december',
] as const;
const MONTH_SHORT = [
  'month_short_jan', 'month_short_feb', 'month_short_mar', 'month_short_apr',
  'month_short_may', 'month_short_jun', 'month_short_jul', 'month_short_aug',
  'month_short_sep', 'month_short_oct', 'month_short_nov', 'month_short_dec',
] as const;

interface Props {
  data: InflationConvertResultDto;
  /** Canlı kontrol ile yeni dönem çekilirken hafif soluklaştırma. */
  isFetching?: boolean;
}

/**
 * Paranın değeri sonucu — hero eşdeğer tutar + kümülatif enflasyon rozeti, alım gücü
 * eğrisi ve satırlar kademeli belirir. Çift yönlü: eşdeğer < tutar ise (geriye gidiş)
 * ton uyarı rengine döner.
 */
export function InflationResultCard({ data, isFetching = false }: Props) {
  const { t } = useTranslation('inflation');
  const { t: tCommon } = useTranslation('common');
  const fmtMoney = useMoneyFmt();
  const reduce = useReducedMotion();

  const rising = data.equivalentAmount >= data.amount;
  const accent = rising ? 'success' : 'warning';
  // İşaret yüzdenin ÖNÜNE (−%12 / +%12); negatifte çift işaret olmasın diye abs.
  const pctText = `${data.inflationPercent < 0 ? '−' : '+'}%${formatNumber(Math.abs(data.inflationPercent))}`;

  const fade = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.18 : 0.32, delay: reduce ? 0 : delay },
  });

  const longDate = (m: number, y: number) => `${tCommon(MONTH_LONG[m - 1])} ${y}`;
  const shortDate = (m: number, y: number) => `${tCommon(MONTH_SHORT[m - 1])} ${y}`;

  const fromLabel = longDate(data.fromMonth, data.fromYear);
  const effLabel = longDate(data.effectiveToMonth, data.effectiveToYear);

  return (
    <Box sx={{ opacity: isFetching ? 0.65 : 1, transition: 'opacity .2s' }}>
      <motion.div {...fade(0)}>
        <SurfaceCard padding={0} sx={{ overflow: 'hidden' }}>
          {/* Hero — eşdeğer tutar */}
          <Box sx={{ p: { xs: 2.2, sm: 2.8 }, bgcolor: (th) => alpha(th.palette[accent].main, th.palette.mode === 'dark' ? 0.1 : 0.07) }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 28, height: 28, borderRadius: 1, display: 'grid', placeItems: 'center',
                    bgcolor: `${accent}.main`, color: `${accent}.contrastText`,
                  }}
                >
                  <Icon icon="mdi:cash-clock" width={16} />
                </Box>
                <Typography sx={eyebrow}>{t('result_eyebrow')}</Typography>
              </Stack>
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{ px: 1.2, py: 0.5, borderRadius: 999, bgcolor: (th) => alpha(th.palette[accent].main, 0.13), color: `${accent}.main` }}
              >
                <Icon icon={rising ? 'mdi:trending-up' : 'mdi:trending-down'} width={14} />
                <Typography component="span" sx={{ fontSize: '0.78rem', fontWeight: 700 }} className="pr-num">
                  {pctText}
                </Typography>
              </Stack>
            </Stack>

            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1.2, minWidth: 0 }}>
              <Typography
                component="div"
                sx={{
                  fontFamily: '"Fraunces", serif', fontWeight: 500,
                  fontSize: { xs: '2.1rem', sm: '2.7rem' }, letterSpacing: '-0.02em',
                  lineHeight: 1.05, color: `${accent}.main`, wordBreak: 'break-word',
                }}
              >
                {fmtMoney(data.equivalentAmount)}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
              {t('result_caption', { amount: fmtMoney(data.amount), from: fromLabel, to: effLabel })}
            </Typography>
          </Box>

          {/* Alım gücü eğrisi + satırlar */}
          <Box sx={{ px: { xs: 2.2, sm: 2.8 }, pt: 2, pb: 1.4, borderTop: '1px solid', borderColor: 'divider' }}>
            <PurchasingPowerChart
              series={data.series}
              rising={rising}
              startLabel={shortDate(data.fromMonth, data.fromYear)}
              endLabel={shortDate(data.effectiveToMonth, data.effectiveToYear)}
            />

            <Box sx={{ mt: 1.6 }}>
              <ResultRow dotColor="text.disabled" label={t('result_input', { date: fromLabel })}>
                <Money value={data.amount} size="sm" weight={600} tone="neutral" />
              </ResultRow>
              <ResultRow dotColor={`${accent}.main`} label={t('result_cumulative')}>
                <Typography component="span" className="pr-num" sx={{ fontSize: '0.92rem', fontWeight: 700, color: `${accent}.main` }}>
                  {pctText}
                </Typography>
              </ResultRow>
              {data.annualizedPercent > 0 && (
                <ResultRow dotColor="text.disabled" label={t('result_annual')}>
                  <Typography component="span" className="pr-num" sx={{ fontSize: '0.92rem', fontWeight: 700 }}>
                    %{formatNumber(data.annualizedPercent)}
                  </Typography>
                </ResultRow>
              )}
              <ResultRow dotColor="text.disabled" label={t('result_multiplier')}>
                <Typography component="span" className="pr-num" sx={{ fontSize: '0.92rem', fontWeight: 700 }}>
                  ×{formatNumber(data.cumulativeMultiplier)}
                </Typography>
              </ResultRow>
            </Box>
          </Box>
        </SurfaceCard>
      </motion.div>

      {/* Veri henüz açıklanmadıysa uyarı */}
      {data.isProvisional && (
        <motion.div {...fade(0.12)}>
          <InfoNote
            icon="mdi:clock-alert-outline"
            paletteKey="warning"
            text={t('provisionalWarning', { date: effLabel })}
          />
        </motion.div>
      )}

      {/* Kaynak notu */}
      <motion.div {...fade(data.isProvisional ? 0.2 : 0.12)}>
        <InfoNote icon="mdi:database-outline" paletteKey="info" text={t('source')} />
      </motion.div>
    </Box>
  );
}

function ResultRow({ dotColor, label, children }: { dotColor: string; label: string; children: ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.2} sx={{ py: 0.9 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0 }} />
      <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1, minWidth: 0 }}>
        {label}
      </Typography>
      {children}
    </Stack>
  );
}

function InfoNote({ icon, paletteKey, text }: { icon: string; paletteKey: 'warning' | 'info'; text: string }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="flex-start"
      sx={{
        mt: 1.6, p: 1.6, borderRadius: 2, border: '1px solid',
        borderColor: (th) => alpha(th.palette[paletteKey].main, 0.28),
        bgcolor: (th) => alpha(th.palette[paletteKey].main, 0.08),
      }}
    >
      <Box sx={{ color: `${paletteKey}.main`, display: 'flex', pt: '1px', flexShrink: 0 }}>
        <Icon icon={icon} width={16} />
      </Box>
      <Typography sx={{ fontSize: '0.78rem', lineHeight: 1.55, color: 'text.secondary' }}>{text}</Typography>
    </Stack>
  );
}

const eyebrow = {
  fontFamily: '"Geist Mono", monospace',
  fontSize: '0.68rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
};
