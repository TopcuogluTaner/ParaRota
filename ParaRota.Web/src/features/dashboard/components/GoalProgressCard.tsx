import { Box, Button, LinearProgress, Skeleton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { EmptyState } from '@shared/components/EmptyState';
import { Money } from '@shared/components/Money';
import { useGoalsQuery } from '@features/goals/api/useGoals';
import { dayjs } from '@shared/lib/dateFormat';
import { useMoneyFmt } from '@shared/lib/maskMoney';

export function GoalProgressCard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const fmtMoney = useMoneyFmt(); // gizlilik modunda tutarları maskeler
  const { data, isLoading, isError } = useGoalsQuery();
  const active = (data ?? []).filter((g) => g.status === 'active').slice(0, 2);

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
            {t('goals_eyebrow')}
          </Typography>
          <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
            {t('goals_title')}
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to="/goals"
          variant="text"
          size="small"
          endIcon={<Icon icon="mdi:arrow-right" width={16} />}
          sx={{ fontSize: '0.82rem' }}
        >
          {t('common:all')}
        </Button>
      </Stack>

      {isLoading ? (
        <Stack spacing={2.2}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Box key={i}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                <Stack direction="row" spacing={1.3} alignItems="center" sx={{ flex: 1 }}>
                  <Skeleton variant="circular" width={28} height={28} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="65%" height={20} />
                    <Skeleton variant="text" width="50%" height={14} />
                  </Box>
                </Stack>
                <Skeleton variant="text" width={48} height={28} />
              </Stack>
              <Skeleton variant="rounded" width="100%" height={10} sx={{ mt: 1.4 }} />
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                <Skeleton variant="text" width={80} height={18} />
                <Skeleton variant="text" width={80} height={18} />
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : isError && !data ? (
        <EmptyState
          icon="mdi:alert-circle-outline"
          title={t('common:error')}
          description={t('errorTitle')}
        />
      ) : active.length === 0 ? (
        <Box
          sx={{
            py: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.2,
            color: 'text.disabled',
            textAlign: 'center',
          }}
        >
          <Icon icon="mdi:target" width={32} />
          <Typography variant="caption" sx={{ textTransform: 'none', letterSpacing: 0, maxWidth: 240 }}>
            {t('common:noData')}
          </Typography>
          <Button
            component={RouterLink}
            to="/goals"
            variant="text"
            size="small"
            startIcon={<Icon icon="mdi:plus" width={14} />}
            sx={{ fontSize: '0.78rem', mt: 0.2 }}
          >
            {t('common:add')}
          </Button>
        </Box>
      ) : (
        <Stack spacing={2.2}>
          {active.map((g, i) => {
            const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
            const remaining = Math.max(0, g.target - g.current);
            const daysLeft = dayjs(g.targetDate).diff(dayjs(), 'day');
            const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));
            const monthly = Math.ceil(remaining / monthsLeft);
            const tone: 'success' | 'warning' | 'error' = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error';

            return (
              <Box key={g.id}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                  <Stack direction="row" spacing={1.3} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0 }}>{g.emoji ?? '🎯'}</Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.92rem' }} noWrap>
                        {g.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}
                      >
                        {t('goal_targetLabel')}: {dayjs(g.targetDate).format('MMM YYYY')} ·{' '}
                        {t('goal_monthlyLabel')}{' '}
                        <Box component="span" className="pr-num" sx={{ fontWeight: 600 }}>
                          {fmtMoney(monthly)}
                        </Box>
                      </Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      className="pr-num"
                      sx={{ fontSize: '1.2rem', fontWeight: 600, lineHeight: 1, color: `${tone}.main` }}
                    >
                      %{pct}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.disabled', textTransform: 'none', letterSpacing: 0 }}
                    >
                      {t('goal_complete')}
                    </Typography>
                  </Box>
                </Stack>

                <Box sx={{ position: 'relative', mt: 1.4 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, pct)}
                    color={tone}
                    sx={{
                      height: 10,
                      borderRadius: 999,
                      bgcolor: (th) => alpha(th.palette.text.disabled, 0.16),
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      left: `${Math.min(100, pct)}%`,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      bgcolor: `${tone}.main`,
                      border: '2px solid',
                      borderColor: 'background.paper',
                      boxShadow: (th) => `0 0 0 3px ${alpha(th.palette[tone].main, 0.2)}`,
                    }}
                  />
                </Box>

                <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                  <Money value={g.current} size="sm" weight={600} tone="go" />
                  <Money value={g.target} size="sm" weight={500} tone="mute" />
                </Stack>

                {i < active.length - 1 && <Box className="pr-route-line" sx={{ mt: 2.5, opacity: 0.5 }} />}
              </Box>
            );
          })}
        </Stack>
      )}
    </SurfaceCard>
  );
}
