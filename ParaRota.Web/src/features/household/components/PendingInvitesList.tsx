import { useState } from 'react';
import { Box, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { dayjs } from '@shared/lib/dateFormat';
import type { HouseholdInviteDto } from '@shared/api/types';
import { InviteShareModal } from './InviteShareModal';

interface Props {
  invites: HouseholdInviteDto[];
  /** Native paylaşım metninde kullanılacak aile adı */
  householdName: string;
  /** Yeniden gönderimi süren davetin id'si (yoksa null) — yalnız o satır spin/disabled. */
  resendingId: number | null;
  /** İptali süren davetin id'si (yoksa null) — yalnız o satır spin/disabled. */
  cancelingId: number | null;
  onResend: (inviteId: number) => void;
  onCancel: (inviteId: number) => void;
  onCopyLink: (token: string) => void;
}

export function PendingInvitesList({ invites, householdName, resendingId, cancelingId, onResend, onCancel, onCopyLink }: Props) {
  const { t } = useTranslation(['household', 'common']);
  const [shareInvite, setShareInvite] = useState<HouseholdInviteDto | null>(null);
  if (invites.length === 0) return null;

  return (
    <>
    <SurfaceCard padding={0} sx={{ mb: { xs: 2, sm: 3 }, overflow: 'hidden' }}>
      <Box sx={{ px: { xs: 1.8, sm: 2.4 }, py: { xs: 1.2, sm: 1.6 }, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: { xs: '0.58rem', sm: '0.62rem' }, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'text.disabled' }}>
          {t('section_invites')} ({invites.length})
        </Typography>
      </Box>
      <Stack divider={<Box sx={{ height: 1, bgcolor: 'divider' }} />}>
        {invites.map((inv) => {
          const isResendingRow = resendingId === inv.id;
          const isCancelingRow = cancelingId === inv.id;
          return (
          <Stack
            key={inv.id}
            direction="row"
            alignItems="center"
            spacing={{ xs: 0.6, sm: 1.1 }}
            sx={{ px: { xs: 1.8, sm: 2.4 }, py: { xs: 1.2, sm: 1.6 } }}
          >
            <Box
              sx={{
                width: { xs: 28, sm: 32 },
                height: { xs: 28, sm: 32 },
                borderRadius: 1.2,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                bgcolor: (th) => alpha(th.palette.warning.main, 0.14),
                color: 'warning.main',
              }}
            >
              <Icon icon="mdi:email-outline" width={15} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Tooltip title={inv.email} arrow placement="top-start">
                <Typography sx={{ fontWeight: 500, fontSize: { xs: '0.82rem', sm: '0.88rem' } }} noWrap>
                  {inv.email}
                </Typography>
              </Tooltip>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0, fontSize: { xs: '0.68rem', sm: '0.72rem' } }}
                noWrap
              >
                {dayjs(inv.expiresAt).format('D MMM')} · {inv.invitedByName}
              </Typography>
            </Box>
            {inv.token && (
              <Tooltip title={t('invite_share')} arrow>
                <IconButton
                  size="small"
                  onClick={() => setShareInvite(inv)}
                  aria-label={t('invite_share')}
                  sx={{ width: 26, height: 26, flexShrink: 0, color: 'primary.main' }}
                >
                  <Icon icon="mdi:qrcode" width={14} />
                </IconButton>
              </Tooltip>
            )}
            {inv.token && (
              <Tooltip title={t('invite_copyLink')} arrow>
                <IconButton
                  size="small"
                  onClick={() => onCopyLink(inv.token)}
                  aria-label={t('invite_copyLink')}
                  sx={{ width: 26, height: 26, flexShrink: 0 }}
                >
                  <Icon icon="mdi:link-variant" width={13} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={t('invite_resend')} arrow>
              <span>
                <IconButton
                  size="small"
                  onClick={() => onResend(inv.id)}
                  disabled={isResendingRow || isCancelingRow}
                  aria-label={t('invite_resend')}
                  sx={{ width: 26, height: 26, flexShrink: 0 }}
                >
                  {isResendingRow ? (
                    <CircularProgress size={13} thickness={5} />
                  ) : (
                    <Icon icon="mdi:email-fast-outline" width={13} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('invite_cancel')} arrow>
              <span>
                <IconButton
                  size="small"
                  onClick={() => onCancel(inv.id)}
                  disabled={isCancelingRow || isResendingRow}
                  aria-label={t('invite_cancel')}
                  sx={{ width: 26, height: 26, flexShrink: 0, '&:hover': { color: 'error.main' } }}
                >
                  {isCancelingRow ? (
                    <CircularProgress size={13} thickness={5} color="error" />
                  ) : (
                    <Icon icon="mdi:close" width={13} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          );
        })}
      </Stack>
    </SurfaceCard>

    {shareInvite?.token && (
      <InviteShareModal
        open={Boolean(shareInvite)}
        onClose={() => setShareInvite(null)}
        token={shareInvite.token}
        email={shareInvite.email}
        householdName={householdName}
      />
    )}
    </>
  );
}
