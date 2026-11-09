import { Box, Button, LinearProgress, Skeleton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { EmptyState } from '@shared/components/EmptyState';
import { Money } from '@shared/components/Money';
import { useDashboardSummaryQuery } from '../api/useDashboard';
import type { DashboardPeriodProps } from '../types/period';

export function BudgetStatusWidget({ month, year }: DashboardPeriodProps) {
  const { t } = useTranslation(['dashboard', 'common', 'pages']);
  const { data, isLoading, isError } = useDashboardSummaryQuery(month, year);

  // budgetStatuses backend tarafından AlertLevel desc + UsagePercentage desc sıralı geliyor
  // (Exceeded → Warning → Normal). Dashboard'da ilk 4 göster.
  const items = (data?.budgetStatuses ?? []).slice(0, 4);

  return (
    <SurfaceCard padding={3} sx={{ height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
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
            {t('budget_eyebrow')}
          </Typography>
          <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
            {t('budget_title')}
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to="/budgets"
          variant="text"
          size="small"
          endIcon={<Icon icon="mdi:arrow-right" width={16} />}
          sx={{ fontSize: '0.82rem' }}
        >
          {t('common:manage')}
        </Button>
      </Stack>

      {isLoading ? (
        <Stack spacing={1.8}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Box key={i}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                <Skeleton variant="text" width="40%" height={20} />
                <Skeleton variant="text" width="30%" height={20} />
              </Stack>
              <Skeleton variant="rounded" width="100%" height={6} />
            </Box>
          ))}
        </Stack>
      ) : isError && !data ? (
        <EmptyState
          icon="mdi:alert-circle-outline"
          title={t('common:error')}
          description={t('errorTitle')}
        />
      ) : items.length === 0 ? (
        <Box
          sx={{
            py: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.2,
            color: 'text.disabled',
            textAlign: 'center',
          }}
        >
          <Icon icon="mdi:wallet-outline" width={32} />
          <Typography variant="caption" sx={{ textTransform: 'none', letterSpacing: 0, maxWidth: 240 }}>
            {t('budget_empty')}
          </Typography>
          <Button
            component={RouterLink}
            to="/budgets"
            variant="text"
            size="small"
            startIcon={<Icon icon="mdi:plus" width={14} />}
            sx={{ fontSize: '0.78rem', mt: 0.2 }}
          >
            {t('budget_empty_cta')}
          </Button>
        </Box>
      ) : (
        <Stack spacing={1.8}>
          {items.map((b) => {
            const rawPct = Math.round(b.usagePercentage);
            const isExceeded = b.alertLevel === 'exceeded';
            const overBy = isExceeded ? Math.max(0, rawPct - 100) : 0;
            const displayPct = Math.min(100, rawPct);
            const tone: 'error' | 'warning' | 'success' = isExceeded
              ? 'error'
              : b.alertLevel === 'warning'
                ? 'warning'
                : 'success';
            const color = b.category.color ?? '#5A6E7C';

            return (
              <Box key={b.id}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '6px',
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: alpha(color, 0.14),
                        color,
                        flexShrink: 0,
                        fontSize: '0.7rem',
                      }}
                    >
                      {b.category.emoji ? b.category.emoji : <Icon icon={b.category.icon} width={12} />}
                    </Box>
                    <Typography sx={{ fontWeight: 500, fontSize: '0.85rem' }} noWrap>
                      {b.category.name}
                    </Typography>
                    {overBy > 0 && (
                      <Box
                        sx={{
                          px: 0.7,
                          py: 0.1,
                          borderRadius: 0.8,
                          bgcolor: (th) => alpha(th.palette.error.main, 0.14),
                          color: 'error.main',
                          fontFamily: '"Geist Mono", monospace',
                          fontSize: '0.66rem',
                          fontWeight: 600,
                          letterSpacing: '0.02em',
                          flexShrink: 0,
                        }}
                      >
                        +%{overBy}
                      </Box>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={0.6} alignItems="baseline" sx={{ flexShrink: 0 }}>
                    <Money value={b.spent} size="sm" weight={600} tone={isExceeded ? 'halt' : 'neutral'} />
                    <Typography
                      component="span"
                      sx={{
                        color: 'text.disabled',
                        fontFamily: '"Geist Mono", monospace',
                        fontSize: '0.78rem',
                      }}
                    >
                      /
                    </Typography>
                    <Money value={b.monthlyLimit} size="sm" weight={500} tone="mute" />
                  </Stack>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={displayPct}
                  color={tone}
                  sx={{
                    height: 6,
                    mt: 0.6,
                    borderRadius: 999,
                    bgcolor: (th) => alpha(th.palette.text.disabled, 0.14),
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      )}
    </SurfaceCard>
  );
}
