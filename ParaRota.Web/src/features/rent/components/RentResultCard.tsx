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
import type { RentIncreaseResultDto } from '@shared/api/types';

const MONTH_LONG = [
  'month_long_january', 'month_long_february', 'month_long_march', 'month_long_april',
  'month_long_may', 'month_long_june', 'month_long_july', 'month_long_august',
  'month_long_september', 'month_long_october', 'month_long_november', 'month_long_december',
] as const;

interface Props {
  data: RentIncreaseResultDto;
  /** Canlı chip kontrolü ile yeni dönem çekilirken hafif soluklaştırma. */
  isFetching?: boolean;
}

/**
 * Sonuç bloğu — yılda birkaç kez yaşanan bir "an": hero + satırlar + notlar
 * 60–80ms arayla kademeli belirir; mevcut↔artış bar'ı soldan dolarak büyür.
 * key parent'ta (dönem/kira değişince) yenilenir, böylece reveal tekrarlanır.
 */
export function RentResultCard({ data, isFetching = false }: Props) {
  const { t } = useTranslation('rent');
  const { t: tCommon } = useTranslation('common');
  const fmtMoney = useMoneyFmt(); // gizlilik modunda hero tutarını maskeler
  const reduce = useReducedMotion();

  const fade = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.18 : 0.32, delay: reduce ? 0 : delay },
  });

  // Bar: mevcut kira ↔ azami artış tek bakışta (yeni kira = %100).
  const total = Math.max(data.maxNewRent, 1);
  const currentPct = (data.currentRent / total) * 100;
  const increasePct = (data.increaseAmount / total) * 100;

  return (
    <Box sx={{ opacity: isFetching ? 0.65 : 1, transition: 'opacity .2s' }}>
      <motion.div {...fade(0)}>
        <SurfaceCard padding={0} sx={{ overflow: 'hidden' }}>
          {/* Hero — yeni kira üst sınırı */}
          <Box sx={{ p: { xs: 2.2, sm: 2.8 }, bgcolor: (th) => alpha(th.palette.success.main, th.palette.mode === 'dark' ? 0.1 : 0.07) }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'success.main',
                    color: 'success.contrastText',
                  }}
                >
                  <Icon icon="mdi:home-percent-outline" width={16} />
                </Box>
                <Typography
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: '0.68rem',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  {t('result_maxRent')}
                </Typography>
              </Stack>
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{
                  px: 1.2,
                  py: 0.5,
                  borderRadius: 999,
                  bgcolor: (th) => alpha(th.palette.success.main, 0.13),
                  color: 'success.main',
                }}
              >
                <Icon icon="mdi:trending-up" width={14} />
                <Typography component="span" sx={{ fontSize: '0.78rem', fontWeight: 700 }} className="pr-num">
                  {t('ratePercent', { rate: formatNumber(data.ratePercent) })}
                </Typography>
              </Stack>
            </Stack>

            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1.2 }}>
              <Typography
                component="div"
                sx={{
                  fontFamily: '"Fraunces", serif',
                  fontWeight: 500,
                  fontSize: { xs: '2.1rem', sm: '2.7rem' },
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                  color: 'success.main',
                }}
              >
                {fmtMoney(data.maxNewRent)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('perMonth')}
              </Typography>
            </Stack>
          </Box>

          {/* Satırlar */}
          <Box sx={{ px: { xs: 2.2, sm: 2.8 }, pt: 2, pb: 1.4, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box
              aria-hidden
              sx={{ display: 'flex', gap: '3px', height: 8, borderRadius: 999, overflow: 'hidden', mb: 1.4 }}
            >
              <Box
                component={motion.div}
                initial={{ width: 0 }}
                animate={{ width: `${currentPct}%` }}
                transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.2, ease: 'easeOut' }}
                sx={{ borderRadius: 999, bgcolor: 'text.disabled' }}
              />
              <Box
                component={motion.div}
                initial={{ width: 0 }}
                animate={{ width: `${increasePct}%` }}
                transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.42, ease: 'easeOut' }}
                sx={{ borderRadius: 999, bgcolor: 'success.main' }}
              />
            </Box>

            <ResultRow dotColor="text.disabled" label={t('result_current')}>
              <Money value={data.currentRent} size="sm" weight={600} tone="neutral" />
            </ResultRow>
            <ResultRow dotColor="success.main" label={t('result_increase')}>
              <Money value={data.increaseAmount} size="sm" weight={600} signed tone="go" />
            </ResultRow>
            <ResultRow dotColor="warning.main" label={t('result_yearly')}>
              <Money value={data.increaseAmount * 12} size="sm" weight={600} signed tone="neutral" sx={{ color: 'warning.main' }} />
            </ResultRow>

            {/* Rota çizgisi — kesik ayraç */}
            <Box
              aria-hidden
              sx={{
                my: 0.8,
                height: '1px',
                backgroundImage: (th) =>
                  `linear-gradient(to right, transparent 0, transparent 3px, ${th.palette.divider} 3px, ${th.palette.divider} 7px)`,
                backgroundSize: '7px 1px',
                backgroundRepeat: 'repeat-x',
              }}
            />
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('result_reference')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {tCommon(MONTH_LONG[data.referenceMonth - 1])} {data.referenceYear}
              </Typography>
            </Stack>
          </Box>
        </SurfaceCard>
      </motion.div>

      {/* Veri henüz açıklanmadıysa uyarı */}
      {data.isProvisional && (
        <motion.div {...fade(0.12)}>
          <InfoNote
            icon="mdi:clock-alert-outline"
            paletteKey="warning"
            text={t('provisionalWarning')}
          />
        </motion.div>
      )}

      {/* Yasal not */}
      <motion.div {...fade(data.isProvisional ? 0.2 : 0.12)}>
        <InfoNote icon="mdi:scale-balance" paletteKey="info" text={t('note')} />
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
        mt: 1.6,
        p: 1.6,
        borderRadius: 2,
        border: '1px solid',
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
