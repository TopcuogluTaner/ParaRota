import { Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { Money } from '@shared/components/Money';
import { useDashboardSummaryQuery } from '../api/useDashboard';
import type { DashboardPeriodProps } from '../types/period';
import { dayjs } from '@shared/lib/dateFormat';
import { useActiveHouseholdStore } from '@features/household/store/useActiveHouseholdStore';

export function RecentTransactions({ month, year }: DashboardPeriodProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const { data, isLoading } = useDashboardSummaryQuery(month, year);
  const recent = data?.recentTransactions ?? [];
  const activeHouseholdId = useActiveHouseholdStore((s) => s.activeId);

  return (
    <SurfaceCard padding={3} sx={{ height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
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
            {t('recent_eyebrow')}
          </Typography>
          <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
            {t('recent_title')}
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to="/transactions"
          variant="text"
          size="small"
          endIcon={<Icon icon="mdi:arrow-right" width={16} />}
          sx={{ fontSize: '0.82rem' }}
        >
          {t('common:all')}
        </Button>
      </Stack>

      {isLoading ? (
        <Stack divider={<Box sx={{ height: 1, bgcolor: 'divider' }} />}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Stack key={i} direction="row" alignItems="center" spacing={1.6} sx={{ py: 1.2 }}>
              <Skeleton variant="rounded" width={38} height={38} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={18} />
                <Skeleton variant="text" width="40%" height={14} />
              </Box>
              <Skeleton variant="text" width={70} height={20} />
            </Stack>
          ))}
        </Stack>
      ) : recent.length === 0 ? (
        <Box
          sx={{
            py: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            color: 'text.disabled',
            textAlign: 'center',
          }}
        >
          <Icon icon="mdi:cash-clock" width={32} />
          <Typography variant="caption" sx={{ textTransform: 'none', letterSpacing: 0, maxWidth: 220 }}>
            {t('recent_empty')}
          </Typography>
        </Box>
      ) : (
        <Stack divider={<Box sx={{ height: 1, bgcolor: 'divider' }} />}>
          {recent.map((tx) => {
            const color = tx.category.color ?? '#5A6E7C';
            const signedValue = tx.type === 'expense' ? -tx.amount : tx.amount;
            return (
              <Stack
                key={tx.id}
                direction="row"
                alignItems="center"
                spacing={1.6}
                sx={{
                  py: 1.2,
                  transition: 'background .2s',
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
                  },
                }}
              >
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 1.4,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    bgcolor: alpha(color, 0.14),
                    color,
                    fontSize: '1.1rem',
                  }}
                >
                  {tx.category.emoji ? tx.category.emoji : <Icon icon={tx.category.icon} width={18} />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 500, fontSize: '0.88rem' }} noWrap>
                    {tx.notes || tx.category.name}
                  </Typography>
                  <Stack direction="row" spacing={0.6} alignItems="center" sx={{ minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}
                      noWrap
                    >
                      {tx.category.name} · {dayjs(tx.transactionDate).format('D MMM, HH:mm')}
                    </Typography>
                    {activeHouseholdId !== null && tx.householdId != null && tx.createdByName && (
                      <Stack
                        direction="row"
                        spacing={0.3}
                        alignItems="center"
                        sx={{
                          flexShrink: 0,
                          px: 0.55,
                          py: 0.1,
                          borderRadius: 0.8,
                          bgcolor: (th) => alpha(th.palette.primary.main, th.palette.mode === 'dark' ? 0.12 : 0.08),
                          color: 'primary.main',
                        }}
                      >
                        <Icon icon="mdi:account-outline" width={11} />
                        <Typography
                          variant="caption"
                          sx={{ fontSize: '0.66rem', fontWeight: 500, letterSpacing: 0, textTransform: 'none', lineHeight: 1.2 }}
                          noWrap
                        >
                          {tx.createdByName}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </Box>
                <Money value={signedValue} currency={tx.currency} signed size="md" weight={600} />
              </Stack>
            );
          })}
        </Stack>
      )}
    </SurfaceCard>
  );
}
