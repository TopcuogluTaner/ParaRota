import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { parseAmount } from '@shared/lib/parseAmount';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import type { GoalDto, GoalStatus, Priority } from '@shared/api/types';
import { useCreateGoal, useUpdateGoal } from '../api/useGoals';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  goal?: GoalDto;
}

interface FormState {
  name: string;
  emoji: string;
  target: string;
  current: string;
  targetDate: string;
  priority: Priority;
  status: GoalStatus;
}

const EMOJI_QUICK = ['🎯', '🏖️', '💻', '🛟', '🚗', '🎓', '🏠', '💍', '✈️', '📱', '🪴', '🎁'];

const DEFAULT_STATE = (): FormState => {
  // 6 ay sonrası default hedef tarihi
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return {
    name: '',
    emoji: '🎯',
    target: '',
    current: '',
    targetDate: d.toISOString().slice(0, 10),
    priority: 'medium',
    status: 'active',
  };
};

export function GoalFormModal({ open, onClose, mode, goal }: Props) {
  const { t } = useTranslation(['pages', 'common']);
  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();

  const [form, setForm] = useState<FormState>(DEFAULT_STATE);
  // İlk başarısız "Kaydet" denemesinden sonra eksik alanları kırmızı + uyarıyla göster.
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAttempted(false);
    if (mode === 'edit' && goal) {
      setForm({
        name: goal.name,
        emoji: goal.emoji ?? '🎯',
        target: String(goal.target),
        current: String(goal.current),
        targetDate: goal.targetDate.slice(0, 10),
        priority: goal.priority,
        status: goal.status,
      });
    } else {
      setForm(DEFAULT_STATE());
    }
    // goal referansı React Query refetch'te değişebilir; sadece id'ye bak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, goal?.id]);

  const targetNum = parseAmount(form.target);
  const currentNum = mode === 'edit' ? parseAmount(form.current) : 0;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const nameMissing = form.name.trim().length === 0;
  const targetInvalid = Number.isNaN(targetNum) || targetNum <= 0;
  const dateMissing = form.targetDate.length === 0;
  const currentInvalid = mode === 'edit' && (Number.isNaN(currentNum) || currentNum < 0);
  const isValid = !nameMissing && !targetInvalid && !dateMissing && !currentInvalid;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    // Eksik alan(lar) varsa: tıklamayı engelleme — net uyarı + kırmızı alan göster.
    if (!isValid) {
      setAttempted(true);
      toast.error(t('goals.toastError'), { id: 'goal-form-validate' });
      return;
    }
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          name: form.name.trim(),
          target: targetNum,
          targetDate: form.targetDate,
          priority: form.priority,
          emoji: form.emoji || undefined,
        });
        toast.success(t('goals.toastCreateSuccess'));
      } else if (goal) {
        await updateMutation.mutateAsync({
          id: goal.id,
          body: {
            name: form.name.trim(),
            target: targetNum,
            current: currentNum,
            targetDate: form.targetDate,
            priority: form.priority,
            status: form.status,
            emoji: form.emoji || undefined,
          },
        });
        toast.success(t('goals.toastUpdateSuccess'));
      }
      onClose();
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('goals.toastError')));
    }
  };

  const pct = targetNum > 0 && currentNum >= 0 && mode === 'edit'
    ? Math.min(100, Math.round((currentNum / targetNum) * 100))
    : 0;

  return (
    <ZoomModal
      open={open}
      onClose={handleClose}
      icon={mode === 'create' ? 'mdi:flag-plus-outline' : 'mdi:pencil-outline'}
      title={mode === 'create' ? t('goals.modalCreateTitle') : t('goals.modalEditTitle')}
      subtitle={mode === 'create' ? t('goals.modalCreateSubtitle') : t('goals.modalEditSubtitle')}
      maxWidth={560}
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
                <Icon icon="mdi:check" width={18} />
              )
            }
          >
            {t('common:save')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.4}>
        {mode === 'create' && <ScopeIndicator />}
        {/* Emoji + name */}
        <Stack direction="row" spacing={1.5} alignItems="flex-end">
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.66rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.6,
              }}
            >
              {t('goals.formEmojiLabel')}
            </Typography>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 1.6,
                border: '1px solid',
                borderColor: 'divider',
                display: 'grid',
                placeItems: 'center',
                fontSize: '1.8rem',
                bgcolor: 'background.default',
              }}
            >
              {form.emoji}
            </Box>
          </Box>
          <TextField
            label={t('goals.formNameLabel')}
            placeholder={t('goals.formNamePlaceholder')}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            fullWidth
            autoFocus={mode === 'create'}
            error={attempted && nameMissing}
            helperText={attempted && nameMissing ? t('goals.toastError') : undefined}
            inputProps={{ maxLength: 100 }}
          />
        </Stack>

        {/* Emoji quick row */}
        <Stack direction="row" spacing={0.4} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          {EMOJI_QUICK.map((e) => (
            <Box
              key={e}
              component="button"
              type="button"
              onClick={() => set('emoji', e)}
              sx={{
                all: 'unset',
                cursor: 'pointer',
                width: 32,
                height: 32,
                borderRadius: 1,
                display: 'grid',
                placeItems: 'center',
                fontSize: '1.2rem',
                border: '1px solid',
                borderColor: form.emoji === e ? 'primary.main' : 'divider',
                bgcolor: form.emoji === e ? (th) => alpha(th.palette.primary.main, 0.1) : 'transparent',
                transition: 'border-color .15s, background-color .15s',
                '&:hover': { borderColor: 'text.disabled' },
              }}
              aria-label={e}
            >
              {e}
            </Box>
          ))}
        </Stack>

        {/* Target amount */}
        <TextField
          label={t('goals.formTargetLabel')}
          type="text"
          value={form.target}
          onChange={(e) => set('target', e.target.value.replace(/[^0-9.,]/g, ''))}
          fullWidth
          error={attempted && targetInvalid}
          helperText={attempted && targetInvalid ? t('goals.toastError') : undefined}
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

        {/* Current (edit only) */}
        {mode === 'edit' && (
          <TextField
            label={t('goals.formCurrentLabel')}
            type="text"
            value={form.current}
            onChange={(e) => set('current', e.target.value.replace(/[^0-9.,]/g, ''))}
            fullWidth
            error={attempted && currentInvalid}
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
                sx: { fontFamily: '"Geist Mono", monospace' },
              },
            }}
            helperText={
              attempted && currentInvalid
                ? t('goals.toastError')
                : !Number.isNaN(targetNum) && !Number.isNaN(currentNum) && targetNum > 0
                  ? `${t('common:percentValue', { value: pct })} ${t('goals.ringComplete')}`
                  : undefined
            }
          />
        )}

        {/* Target date */}
        <TextField
          label={t('goals.formTargetDateLabel')}
          type="date"
          value={form.targetDate}
          onChange={(e) => set('targetDate', e.target.value)}
          fullWidth
          error={attempted && dateMissing}
          helperText={attempted && dateMissing ? t('goals.toastError') : undefined}
          InputLabelProps={{ shrink: true }}
        />

        {/* Priority */}
        <TextField
          select
          label={t('goals.formPriorityLabel')}
          value={form.priority}
          onChange={(e) => set('priority', e.target.value as Priority)}
          fullWidth
        >
          <MenuItem value="low">
            <Stack direction="row" spacing={1} alignItems="center">
              <Icon icon="mdi:flag-outline" width={16} />
              {t('goals.priorityLow')}
            </Stack>
          </MenuItem>
          <MenuItem value="medium">
            <Stack direction="row" spacing={1} alignItems="center">
              <Icon icon="mdi:flag-variant-outline" width={16} />
              {t('goals.priorityMedium')}
            </Stack>
          </MenuItem>
          <MenuItem value="high">
            <Stack direction="row" spacing={1} alignItems="center">
              <Icon icon="mdi:flag" width={16} style={{ color: 'var(--pr-halt)' }} />
              {t('goals.priorityHigh')}
            </Stack>
          </MenuItem>
        </TextField>

        {/* Status (edit only) */}
        {mode === 'edit' && (
          <TextField
            select
            label={t('goals.formStatusLabel')}
            value={form.status}
            onChange={(e) => set('status', e.target.value as GoalStatus)}
            fullWidth
          >
            <MenuItem value="active">
              <Stack direction="row" spacing={1} alignItems="center">
                <Icon icon="mdi:rocket-launch-outline" width={16} />
                {t('goals.statusActive')}
              </Stack>
            </MenuItem>
            <MenuItem value="completed">
              <Stack direction="row" spacing={1} alignItems="center">
                <Icon icon="mdi:check-circle-outline" width={16} style={{ color: 'var(--pr-go)' }} />
                {t('goals.statusCompleted')}
              </Stack>
            </MenuItem>
            <MenuItem value="paused">
              <Stack direction="row" spacing={1} alignItems="center">
                <Icon icon="mdi:pause-circle-outline" width={16} />
                {t('goals.statusPaused')}
              </Stack>
            </MenuItem>
          </TextField>
        )}

        {mode === 'edit' && (
          <Alert
            severity="info"
            icon={<Icon icon="mdi:information-outline" width={18} />}
            sx={{ '& .MuiAlert-message': { fontSize: '0.82rem' } }}
          >
            {t('goals.modalEditSubtitle')}
          </Alert>
        )}
      </Stack>
    </ZoomModal>
  );
}
