import { useState } from 'react';
import { Box, IconButton, Stack, Typography, Grid, Button, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { authApi } from '@features/auth/api/authApi';
import { SweetAlert } from '@shared/lib/sweetAlert';
import { SectionHeader } from '@shared/components/SectionHeader';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { Money } from '@shared/components/Money';
import { useDashboardSummaryQuery } from '@features/dashboard/api/useDashboard';
import { useOnboardingStore } from '@features/onboarding';
import { AvatarPickerModal } from '../components/AvatarPickerModal';
import { UserAvatar } from '../components/UserAvatar';

export function ProfilePage() {
  const { t } = useTranslation('pages');
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const replayOnboarding = useOnboardingStore((s) => s.replay);
  const [deleting, setDeleting] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const handleDeleteAccount = async () => {
    const ok = await SweetAlert.confirm(t('profile.deleteAccountTitle'), t('profile.deleteAccountConfirm'));
    if (!ok) return;
    setDeleting(true);
    try {
      const resp = await authApi.deleteAccount();
      if (!resp.data.isSuccess) {
        SweetAlert.apiError({ response: { data: resp.data } });
        return;
      }
      await SweetAlert.success(t('profile.deleteAccountDone'));
      logout();
    } catch (err) {
      SweetAlert.apiError(err);
    } finally {
      setDeleting(false);
    }
  };
  const name = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
    : t('userMenu.guest');

  const { data } = useDashboardSummaryQuery();
  const summary = {
    income: data?.income ?? 0,
    expense: data?.expense ?? 0,
    net: data?.net ?? 0,
    savingsRate: data?.savingsRate ?? 0,
  };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        description={t('profile.description')}
      />

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SurfaceCard padding={3} sx={{ height: '100%', textAlign: 'center' }}>
            {/* Rozet + düzenleme rozeti — modal mobil AvatarPickerModal'ın portu */}
            <Box sx={{ position: 'relative', width: 88, mx: 'auto', mb: 2 }}>
              <UserAvatar
                user={user}
                size={88}
                fallback="P"
                sx={{
                  fontSize: '2rem',
                  boxShadow: (th) =>
                    th.palette.mode === 'dark'
                      ? '0 0 0 4px rgba(46,201,152,0.16)'
                      : '0 0 0 4px rgba(15,139,108,0.14)',
                }}
              />
              <Tooltip title={t('profile.avatarEdit')} arrow>
                <IconButton
                  size="small"
                  onClick={() => setAvatarOpen(true)}
                  aria-label={t('profile.avatarEdit')}
                  sx={{
                    position: 'absolute',
                    bottom: -4,
                    insetInlineEnd: -4,
                    width: 30,
                    height: 30,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: (th) =>
                      th.palette.mode === 'dark'
                        ? '0 4px 12px rgba(0,0,0,0.4)'
                        : '0 4px 12px rgba(43,30,14,0.14)',
                    '&:hover': { bgcolor: 'background.paper', color: 'primary.main' },
                  }}
                >
                  <Icon icon="mdi:pencil-outline" width={15} />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
              {name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              {user?.email ?? '—'}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.7rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'text.disabled',
              }}
            >
              <Icon icon="mdi:check-decagram" width={14} style={{ color: 'var(--pr-go)' }} />
              {t('profile.verifiedBadge')}
            </Stack>
          </SurfaceCard>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <SurfaceCard padding={3} sx={{ height: '100%' }}>
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
              {t('profile.monthlyRouteEyebrow')}
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, mb: 3 }}>
              {t('profile.monthlyRouteTitle')}
            </Typography>

            <Grid container spacing={2}>
              <ProfileStat label={t('profile.statIncome')} value={summary.income} tone="go" />
              <ProfileStat label={t('profile.statExpense')} value={summary.expense} tone="halt" />
              <ProfileStat label={t('profile.statNet')} value={summary.net} tone="neutral" />
              <ProfileStat
                label={t('profile.statSavingsPercent')}
                value={summary.savingsRate * 100}
                tone="way"
                unit="%"
              />
            </Grid>
          </SurfaceCard>
        </Grid>
      </Grid>

      {/* Tanıtım turunu tekrar göster — slaytlar + ana tur + sayfa turları sıfırlanır */}
      <SurfaceCard padding={3} sx={{ mt: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Typography sx={{ fontWeight: 600 }}>{t('onboarding:replay')}</Typography>
          <Button
            variant="outlined"
            onClick={replayOnboarding}
            startIcon={<Icon icon="mdi:compass-outline" width={18} />}
            sx={{ flexShrink: 0, borderRadius: 999 }}
          >
            {t('onboarding:start')}
          </Button>
        </Stack>
      </SurfaceCard>

      {/* Tehlikeli bölge — hesap silme */}
      <SurfaceCard padding={3} sx={{ mt: 2.5, borderColor: (th) => alpha(th.palette.error.main, 0.4) }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Box>
            <Typography sx={{ fontWeight: 600, color: 'error.main' }}>{t('profile.deleteAccountTitle')}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>{t('profile.deleteAccountSubtitle')}</Typography>
          </Box>
          <Button
            variant="outlined"
            color="error"
            disabled={deleting}
            onClick={handleDeleteAccount}
            startIcon={<Icon icon="mdi:trash-can-outline" width={18} />}
            sx={{ flexShrink: 0, borderRadius: 999 }}
          >
            {t('profile.deleteAccountTitle')}
          </Button>
        </Stack>
      </SurfaceCard>

      <AvatarPickerModal open={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </Box>
  );
}

function ProfileStat({
  label,
  value,
  tone,
  unit,
}: {
  label: string;
  value: number;
  tone: 'go' | 'halt' | 'way' | 'neutral';
  unit?: string;
}) {
  const moneyTone = tone === 'way' ? 'neutral' : tone;
  const colorOverride = tone === 'way' ? { color: 'warning.main' } : undefined;
  return (
    <Grid size={{ xs: 6, sm: 3 }}>
      <Box>
        <Typography
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: '0.62rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'text.disabled',
            mb: 0.4,
          }}
        >
          {label}
        </Typography>
        <Money value={value} unit={unit} size="lg" weight={600} tone={moneyTone} sx={colorOverride} />
      </Box>
    </Grid>
  );
}
