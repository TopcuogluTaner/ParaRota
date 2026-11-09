import { useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Stack, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useEntitlement } from '@features/subscription/hooks/useEntitlement';
import { usePaywallStore } from '@features/subscription/store/usePaywallStore';
import { notifyError, notifySuccess } from '@shared/lib/apiError';
import { useActiveHouseholdStore } from '../store/useActiveHouseholdStore';
import { useLeaveHousehold, useMyMembershipsQuery } from '../api/useHousehold';
import { HouseholdPage } from '../pages/HouseholdPage';
import type { HouseholdDto } from '@shared/api/types';

/**
 * /household kapısı: premium → tam sayfa; değilse paywall + üyelik listesi.
 * Premium'u biten üye aile VERİSİNİ göremez ama üyeliklerini görüp AYRILABİLİR —
 * aksi halde Leave akışına UI'dan ulaşmanın hiçbir yolu kalmıyordu (mobil paritesi).
 */
export function HouseholdGate() {
  const { isPremium } = useEntitlement();
  if (isPremium) return <HouseholdPage />;
  return <LockedWithMemberships />;
}

function LockedWithMemberships() {
  const { t } = useTranslation(['paywall', 'household', 'common']);
  const show = usePaywallStore((s) => s.show);
  const memberships = useMyMembershipsQuery();
  const setActive = useActiveHouseholdStore((s) => s.setActive);
  const [leaveTarget, setLeaveTarget] = useState<HouseholdDto | null>(null);
  const leave = useLeaveHousehold(leaveTarget?.id ?? 0);

  const confirmLeave = async () => {
    if (!leaveTarget) return;
    try {
      await leave.mutateAsync({ mode: 'personal' });
      notifySuccess(t('household:leave_toastSuccess'));
      setActive(null);
    } catch (err) {
      notifyError(err);
    } finally {
      setLeaveTarget(null);
    }
  };

  const items = memberships.data ?? [];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', px: 3, py: 6 }}>
      <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center', maxWidth: 460, width: '100%' }}>
        <Box
          sx={{
            width: 80, height: 80, borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: (th) => alpha(th.palette.success.main, 0.1),
            color: 'success.main',
          }}
        >
          <Icon icon="mdi:lock-outline" width={36} />
        </Box>
        <Typography variant="overline" color="text.secondary">{t('paywall:locked.eyebrow')}</Typography>
        <Typography variant="h5" fontWeight={700}>{t('paywall:features.household.title')}</Typography>
        <Typography variant="body2" color="text.secondary">{t('paywall:features.household.desc')}</Typography>
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<Icon icon="mdi:crown-outline" width={20} />}
          onClick={() => show('household')}
          sx={{ mt: 1, borderRadius: 2 }}
        >
          {t('paywall:cta.unlock')}
        </Button>

        {items.length > 0 ? (
          <Box sx={{ width: '100%', mt: 4, textAlign: 'left' }}>
            <Typography variant="overline" color="text.disabled">{t('household:locked_membershipsTitle')}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {t('household:locked_hint')}
            </Typography>
            <Stack spacing={1}>
              {items.map((h) => {
                const isOwner = h.myRole === 'owner';
                return (
                  <Stack
                    key={h.id}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                  >
                    <Icon icon="mdi:account-group-outline" width={20} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{h.name}</Typography>
                      {isOwner ? (
                        <Typography variant="caption" color="text.secondary">
                          {t('household:locked_ownerNote')}
                        </Typography>
                      ) : null}
                    </Box>
                    {!isOwner ? (
                      <Button size="small" color="error" variant="outlined" onClick={() => setLeaveTarget(h)}>
                        {t('household:leave_button')}
                      </Button>
                    ) : null}
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        ) : null}
      </Stack>

      <Dialog open={leaveTarget != null} onClose={() => setLeaveTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('household:leave_modalTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('household:locked_leaveConfirm', { name: leaveTarget?.name ?? '' })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveTarget(null)}>{t('common:cancel')}</Button>
          <Button color="error" variant="contained" disabled={leave.isPending} onClick={() => void confirmLeave()}>
            {t('household:leave_button')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
