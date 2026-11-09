import { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import type { HouseholdDto, HouseholdMemberDto, LeaveMode } from '@shared/api/types';
import { useLeaveHousehold } from '../api/useHousehold';
import { useActiveHouseholdStore } from '../store/useActiveHouseholdStore';

interface Props {
  open: boolean;
  onClose: () => void;
  household: HouseholdDto;
  members: HouseholdMemberDto[];
  currentUserId: number;
}

const MODE_ICONS: Record<LeaveMode, string> = {
  transfer: 'mdi:account-arrow-right-outline',
  personal: 'mdi:account-outline',
  delete: 'mdi:trash-can-outline',
};

const MODE_TONES: Record<LeaveMode, 'info' | 'warning' | 'error'> = {
  transfer: 'info',
  personal: 'warning',
  delete: 'error',
};

export function LeaveHouseholdModal({ open, onClose, household, members, currentUserId }: Props) {
  const { t } = useTranslation(['household', 'common']);
  const theme = useTheme();
  const leave = useLeaveHousehold(household.id);
  const setActive = useActiveHouseholdStore((s) => s.setActive);

  const otherActiveMembers = useMemo(
    () => members.filter((m) => m.userId !== currentUserId && m.status === 'active'),
    [members, currentUserId],
  );

  const isOwner = household.myRole === 'owner';
  const onlySelf = otherActiveMembers.length === 0;

  // Owner ise: 3 mode. Member ise: sadece "Personal" (kendi kayıtlarını alır) ya da basit ayrıl.
  // Sadece kendi varsa transfer yok.
  const availableModes: LeaveMode[] = useMemo(() => {
    if (!isOwner) return ['personal']; // Member için sadeleştir — sadece kendi katkıları
    if (onlySelf) return ['personal', 'delete'];
    return ['transfer', 'personal', 'delete'];
  }, [isOwner, onlySelf]);

  const [mode, setMode] = useState<LeaveMode>(availableModes[0]);
  const [targetUserId, setTargetUserId] = useState<number | ''>(
    otherActiveMembers[0]?.userId ?? '',
  );

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(availableModes[0]);
    setTargetUserId(otherActiveMembers[0]?.userId ?? '');
  }, [open, availableModes, otherActiveMembers]);

  const canSubmit =
    !leave.isPending && (mode !== 'transfer' || (typeof targetUserId === 'number' && targetUserId > 0));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await leave.mutateAsync({
        mode,
        targetUserId: mode === 'transfer' ? Number(targetUserId) : undefined,
      });
      toast.success(t('leave_toastSuccess'));
      setActive(null);
      onClose();
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('common:errorGeneric')));
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={() => !leave.isPending && onClose()}
      icon="mdi:exit-run"
      title={t('leave_modalTitle')}
      subtitle={t('leave_modalSubtitle')}
      maxWidth={580}
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={leave.isPending}>
            {t('common:cancel')}
          </Button>
          <Button
            variant="contained"
            color={mode === 'delete' ? 'error' : 'primary'}
            onClick={handleSubmit}
            disabled={!canSubmit}
            startIcon={<Icon icon={MODE_ICONS[mode]} width={18} />}
          >
            {t('leave_confirm')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.4}>
        {isOwner && onlySelf && (
          <Alert severity="info" icon={<Icon icon="mdi:information-outline" width={18} />}>
            {t('leave_onlyOwner_hint')}
          </Alert>
        )}

        <Box>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.62rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mb: 0.8,
            }}
          >
            {t('leave_mode_label')}
          </Typography>
          <Stack spacing={1}>
            {availableModes.map((m) => {
              const tone = MODE_TONES[m];
              const accent = theme.palette[tone].main;
              const active = mode === m;
              return (
                <Box
                  key={m}
                  component="button"
                  type="button"
                  onClick={() => setMode(m)}
                  sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    p: 1.6,
                    borderRadius: 1.6,
                    border: '1px solid',
                    borderColor: active ? accent : 'divider',
                    bgcolor: active ? alpha(accent, 0.08) : 'transparent',
                    transition: 'border-color .15s, background-color .15s',
                    '&:hover': { borderColor: alpha(accent, 0.6) },
                  }}
                >
                  <Stack direction="row" spacing={1.4} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1.2,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        bgcolor: alpha(accent, 0.14),
                        color: accent,
                      }}
                    >
                      <Icon icon={MODE_ICONS[m]} width={16} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.92rem' }}>
                        {t(`leave_mode_${m}_title`)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          textTransform: 'none',
                          letterSpacing: 0,
                          lineHeight: 1.5,
                          display: 'block',
                          mt: 0.4,
                        }}
                      >
                        {t(`leave_mode_${m}_hint`)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {mode === 'transfer' && otherActiveMembers.length > 0 && (
          <TextField
            select
            label={t('leave_select_target')}
            value={targetUserId === '' ? '' : String(targetUserId)}
            onChange={(e) => setTargetUserId(Number(e.target.value))}
            fullWidth
          >
            {otherActiveMembers.map((m) => (
              <MenuItem key={m.userId} value={m.userId}>
                {m.firstName} {m.lastName} · {m.email}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>
    </ZoomModal>
  );
}
