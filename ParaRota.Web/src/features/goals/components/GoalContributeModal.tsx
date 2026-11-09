import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { Money } from '@shared/components/Money';
import { parseAmount } from '@shared/lib/parseAmount';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import type { GoalDto } from '@shared/api/types';
import { useUpdateGoal } from '../api/useGoals';

interface Props {
  open: boolean;
  onClose: () => void;
  goal: GoalDto | null;
}

const QUICK_AMOUNTS = [100, 250, 500, 1000];

export function GoalContributeModal({ open, onClose, goal }: Props) {
  const { t } = useTranslation(['pages', 'common']);
  const updateMutation = useUpdateGoal();
  const [amount, setAmount] = useState('');
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAmount('');
    setAttempted(false);
  }, [open, goal?.id]);

  const amountNum = parseAmount(amount);
  const isValid = !Number.isNaN(amountNum) && amountNum > 0;
  const isSubmitting = updateMutation.isPending;

  const nextCurrent = goal && isValid ? goal.current + amountNum : (goal?.current ?? 0);
  const nextPct =
    goal && goal.target > 0 ? Math.min(100, Math.round((nextCurrent / goal.target) * 100)) : 0;
  const willComplete = goal ? nextCurrent >= goal.target && goal.target > 0 : false;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (isSubmitting || !goal) return;
    // Geçersiz tutar: tıklamayı engelleme — net uyarı + kırmızı alan göster.
    if (!isValid) {
      setAttempted(true);
      toast.error(t('goals.toastError'), { id: 'goal-contribute-validate' });
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: goal.id,
        body: {
          name: goal.name,
          target: goal.target,
          current: goal.current + amountNum,
          targetDate: goal.targetDate,
          priority: goal.priority,
          status: willComplete ? 'completed' : goal.status,
          emoji: goal.emoji || undefined,
        },
      });
      toast.success(t('goals.contribute_toastSuccess'));
      onClose();
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('goals.toastError')));
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={handleClose}
      icon="mdi:cash-plus"
      title={t('goals.contribute_modalTitle')}
      subtitle={goal?.name}
      maxWidth={460}
      actions={
        <>
          <Button variant="text" onClick={handleClose} disabled={isSubmitting}>
            {t('common:cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={16} thickness={5} />
              ) : (
                <Icon icon="mdi:plus" width={18} />
              )
            }
          >
            {t('goals.contribute_submit')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.4}>
        <TextField
          label={t('goals.contribute_amountLabel')}
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
          fullWidth
          autoFocus
          error={attempted && !isValid}
          helperText={attempted && !isValid ? t('goals.toastError') : undefined}
          inputProps={{ inputMode: 'decimal' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Typography className="pr-num" sx={{ fontWeight: 600, color: 'text.disabled' }}>
                    ₺
                  </Typography>
                </InputAdornment>
              ),
              sx: { fontFamily: '"Geist Mono", monospace', fontSize: '1.2rem', fontWeight: 600 },
            },
          }}
        />

        <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', gap: 0.8 }}>
          {QUICK_AMOUNTS.map((q) => (
            <Box
              key={q}
              component="button"
              type="button"
              onClick={() => setAmount(String(q))}
              sx={{
                all: 'unset',
                cursor: 'pointer',
                px: 1.4,
                py: 0.6,
                borderRadius: 1.2,
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: 'divider',
                color: 'text.secondary',
                transition: 'border-color .15s, background-color .15s, color .15s',
                '&:hover': {
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  bgcolor: (th) => alpha(th.palette.primary.main, 0.08),
                },
              }}
            >
              +{q.toLocaleString('tr-TR')}
            </Box>
          ))}
        </Stack>

        {goal && (
          <Box
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
              p: 2,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography
                variant="caption"
                sx={{ textTransform: 'none', letterSpacing: 0, color: 'text.disabled' }}
              >
                {t('goals.contribute_newTotal')}
              </Typography>
              <Money value={nextCurrent} size="md" weight={600} tone={willComplete ? 'go' : 'neutral'} />
            </Stack>
            <Box
              aria-hidden
              sx={{
                mt: 1.4,
                height: 6,
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: (th) => alpha(th.palette.divider, 0.4),
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${nextPct}%`,
                  borderRadius: 3,
                  bgcolor: 'success.main',
                  transition: 'width .3s',
                }}
              />
            </Box>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.8,
                textTransform: 'none',
                letterSpacing: 0,
                color: willComplete ? 'success.main' : 'text.secondary',
                fontWeight: willComplete ? 600 : 400,
              }}
            >
              {willComplete
                ? t('goals.contribute_willComplete')
                : `${t('common:percentValue', { value: nextPct })} ${t('goals.ringComplete')}`}
            </Typography>
          </Box>
        )}
      </Stack>
    </ZoomModal>
  );
}
