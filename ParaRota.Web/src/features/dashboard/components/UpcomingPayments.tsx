import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { Money } from '@shared/components/Money';
import { SignalBadge } from '@shared/components/SignalBadge';
import { useDashboardSummaryQuery } from '../api/useDashboard';
import type { DashboardPeriodProps } from '../types/period';
import { dayjs } from '@shared/lib/dateFormat';

export function UpcomingPayments({ month, year }: DashboardPeriodProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const { data, isLoading } = useDashboardSummaryQuery(month, year);

  const upcoming = data?.upcomingPayments ?? [];
  const total = upcoming.reduce((s, tx) => s + tx.amount, 0);

  return (
    <SurfaceCard padding={3} sx={{ height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.66rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mb: 0.5,
            }}
          >
            {t('upcoming_eyebrow')}
          </Typography>
          <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
            {t('upcoming_title')}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
            {t('upcoming_totalLabel')}
          </Typography>
          <Box>
            <Money value={total} size="md" weight={600} tone="halt" />
          </Box>
        </Box>
      </Stack>

      {isLoading ? (
        <Stack spacing={1.2}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Stack
              key={i}
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ p: 1.4, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}
            >
              <Skeleton variant="rounded" width={40} height={40} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="65%" height={18} />
                <Skeleton variant="text" width="40%" height={14} />
              </Box>
              <Skeleton variant="text" width={70} height={20} />
            </Stack>
          ))}
        </Stack>
      ) : upcoming.length === 0 ? (
        <Box
          sx={{
            py: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            color: 'text.disabled',
            textAlign: 'center',
          }}
        >
          <Icon icon="mdi:calendar-check-outline" width={32} />
          <Typography variant="caption" sx={{ textTransform: 'none', letterSpacing: 0, maxWidth: 220 }}>
            {t('upcoming_empty')}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.2}>
          {upcoming.map((tx) => {
            const date = dayjs(tx.transactionDate);
            // Geçmiş tarihli (vadesi geçmiş) ödemeler negatif gün üretip "-2 gün"
            // gibi görünmesin diye 0'a clamp'liyoruz → "bugün" etiketine düşer.
            const daysAway = Math.max(0, date.diff(dayjs(), 'day'));
            const color = tx.category.color ?? '#5A6E7C';
            return (
              <Stack
                key={tx.id}
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{
                  p: 1.4,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.6) : 'background.default',
                  position: 'relative',
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.4,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    bgcolor: alpha(color, 0.14),
                    color,
                    fontSize: '1.1rem',
                  }}
                >
                  {tx.category.emoji ? tx.category.emoji : <Icon icon={tx.category.icon} width={20} />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={0.8} alignItems="center">
                    <Typography sx={{ fontWeight: 500, fontSize: '0.88rem' }} noWrap>
                      {tx.notes || tx.category.name}
                    </Typography>
                    {tx.source === 'recurring' && (
                      <Icon icon="mdi:repeat" width={13} style={{ color: 'var(--pr-ink-mute)' }} />
                    )}
                  </Stack>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}
                  >
                    {date.format('D MMM')} ·{' '}
                    {daysAway === 0 ? t('upcoming_today') : t('upcoming_days', { count: daysAway })}
                  </Typography>
                </Box>
                <Stack alignItems="flex-end" spacing={0.4}>
                  <Money value={-tx.amount} currency={tx.currency} signed size="md" weight={600} />
                  <SignalBadge tone="way" size="xs" variant="soft">
                    {t('common:planned')}
                  </SignalBadge>
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      )}
    </SurfaceCard>
  );
}
