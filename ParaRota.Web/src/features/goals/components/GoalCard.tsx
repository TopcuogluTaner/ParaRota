import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { SignalBadge } from '@shared/components/SignalBadge';
import { Money } from '@shared/components/Money';
import { dayjs } from '@shared/lib/dateFormat';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import type { GoalDto } from '@shared/api/types';
import { GoalRing } from './GoalRing';

interface Props {
  goal: GoalDto;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onContribute: () => void;
}

export function GoalCard({ goal, index, onEdit, onDelete, onContribute }: Props) {
  const { t } = useTranslation(['pages', 'common']);
  const fmtMoney = useMoneyFmt(); // gizlilik modunda tutarları maskeler
  const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
  const remaining = Math.max(0, goal.target - goal.current);
  const daysLeft = dayjs(goal.targetDate).diff(dayjs(), 'day');
  const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));
  const monthly = remaining > 0 ? Math.ceil(remaining / monthsLeft) : 0;
  const isCompleted = goal.status === 'completed';
  const isPaused = goal.status === 'paused';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
      style={{ height: '100%' }}
    >
      <SurfaceCard
        padding={3}
        glow={isCompleted ? 'go' : 'none'}
        sx={{
          height: '100%',
          opacity: isPaused ? 0.7 : 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box sx={{ fontSize: '2.2rem', lineHeight: 1 }}>{goal.emoji ?? '🎯'}</Box>
          <Stack direction="row" spacing={0.6} alignItems="center">
            {isCompleted && (
              <SignalBadge tone="go" size="sm" variant="solid" icon={<Icon icon="mdi:check" width={12} />}>
                {t('goals.badgeCompleted')}
              </SignalBadge>
            )}
            {isPaused && (
              <SignalBadge tone="way" size="sm" icon={<Icon icon="mdi:pause" width={12} />}>
                {t('goals.badgePaused')}
              </SignalBadge>
            )}
            {!isCompleted && !isPaused && goal.priority === 'high' && (
              <SignalBadge tone="halt" size="sm" icon={<Icon icon="mdi:flag" width={12} />}>
                {t('goals.badgeHighPriority')}
              </SignalBadge>
            )}
          </Stack>
        </Stack>

        <Typography
          sx={{
            fontFamily: '"Fraunces", serif',
            fontWeight: 500,
            fontSize: '1.35rem',
            lineHeight: 1.15,
            mb: 0.5,
          }}
        >
          {goal.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{ textTransform: 'none', letterSpacing: 0, color: 'text.secondary' }}
        >
          {t('goals.targetLabel')}: {dayjs(goal.targetDate).format('D MMMM YYYY')}
        </Typography>

        <Stack direction="row" spacing={2.5} alignItems="center" sx={{ mt: 2.5 }}>
          <GoalRing value={pct} label={t('goals.ringComplete')} />
          <Stack spacing={1.4} sx={{ flex: 1, minWidth: 0 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{ textTransform: 'none', letterSpacing: 0, color: 'text.disabled' }}
              >
                {t('goals.savedLabel')}
              </Typography>
              <Box>
                <Money value={goal.current} size="md" weight={600} tone="go" />
              </Box>
            </Box>
            <Box>
              <Typography
                variant="caption"
                sx={{ textTransform: 'none', letterSpacing: 0, color: 'text.disabled' }}
              >
                {t('goals.targetAmountLabel')}
              </Typography>
              <Box>
                <Money value={goal.target} size="md" weight={500} tone="neutral" />
              </Box>
            </Box>
          </Stack>
        </Stack>

        {/* Projection */}
        {!isCompleted && remaining > 0 && (
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              mt: 2.5,
              p: 1.4,
              borderRadius: 1.6,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                sx={{ display: 'block', textTransform: 'none', letterSpacing: 0, color: 'text.disabled' }}
              >
                {t('goals.projection_perMonth')}
              </Typography>
              <Box sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 600, fontSize: '0.92rem' }}>
                {fmtMoney(monthly)}
              </Box>
            </Box>
            <Box sx={{ width: 1, bgcolor: 'divider', opacity: 0.6 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                sx={{ display: 'block', textTransform: 'none', letterSpacing: 0, color: 'text.disabled' }}
              >
                {t('goals.projection_monthsLeft')}
              </Typography>
              <Box sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 600, fontSize: '0.92rem' }}>
                {daysLeft > 0 ? t('goals.projection_months', { count: monthsLeft }) : t('goals.deadlinePassed')}
              </Box>
            </Box>
          </Stack>
        )}

        <Box className="pr-route-line" sx={{ mt: 2.5, opacity: 0.6 }} />
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5, flex: 1 }}>
          <Typography variant="caption" sx={{ textTransform: 'none', letterSpacing: 0, color: 'text.secondary' }}>
            {isCompleted ? (
              <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>
                {t('goals.completedMessage')}
              </Box>
            ) : remaining > 0 ? (
              <>
                {t('goals.monthlyAvg')}{' '}
                <Box component="strong" className="pr-num">
                  {fmtMoney(monthly)}
                </Box>
              </>
            ) : null}
          </Typography>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.7rem',
              color: daysLeft < 30 && daysLeft > 0 ? 'warning.main' : daysLeft <= 0 ? 'error.main' : 'text.disabled',
            }}
          >
            <Icon icon="mdi:flag-checkered" width={13} />
            {daysLeft > 0 ? t('goals.deadlineDays', { count: daysLeft }) : t('goals.deadlinePassed')}
          </Box>
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={0.2} sx={{ mt: 1.2 }}>
          {!isCompleted ? (
            <Button
              size="small"
              variant="outlined"
              onClick={onContribute}
              startIcon={<Icon icon="mdi:cash-plus" width={16} />}
              sx={{ minHeight: 30, px: 1.4, textTransform: 'none', letterSpacing: 0 }}
            >
              {t('goals.contribute_action')}
            </Button>
          ) : (
            <Box />
          )}
          <Stack direction="row" spacing={0.2} alignItems="center">
          <Tooltip title={t('common:edit')} arrow>
            <IconButton size="small" onClick={onEdit} aria-label={t('common:edit')} sx={{ width: 28, height: 28 }}>
              <Icon icon="mdi:pencil-outline" width={15} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common:delete')} arrow>
            <IconButton
              size="small"
              onClick={onDelete}
              aria-label={t('common:delete')}
              sx={{ width: 28, height: 28, '&:hover': { color: 'error.main' } }}
            >
              <Icon icon="mdi:trash-can-outline" width={15} />
            </IconButton>
          </Tooltip>
          </Stack>
        </Stack>

        {/* Bottom progress strip */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 3,
            background: (th) =>
              `linear-gradient(to right, ${th.palette.success.main} 0%, ${th.palette.success.main} ${pct}%, ${alpha(th.palette.divider, 0.4)} ${pct}%, ${alpha(th.palette.divider, 0.4)} 100%)`,
          }}
        />
      </SurfaceCard>
    </motion.div>
  );
}
