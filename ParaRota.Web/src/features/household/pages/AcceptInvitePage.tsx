import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { Link as RouterLink, Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { useAcceptInvite } from '../api/useHousehold';
import { useActiveHouseholdStore } from '../store/useActiveHouseholdStore';

const APP_STORE_URL = 'https://apps.apple.com/app/id6778436063';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.pararotam.mobile';

// Uygulama yüklüyse link zaten uygulamada açılır (App Links / Universal Links);
// bu CTA yalnızca uygulaması olmayan mobil kullanıcıya mağazayı gösterir.
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const isAndroid = /android/i.test(ua);
const isIos = /iphone|ipad|ipod/i.test(ua);

export function AcceptInvitePage() {
  const { t } = useTranslation(['household', 'common']);
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accept = useAcceptInvite();
  const setActive = useActiveHouseholdStore((s) => s.setActive);
  const [done, setDone] = useState<{ name?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(t('accept_invalid'));
  }, [token, t]);

  // Unauthenticated → login'e yönlendir, query string'i koru
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}`} replace />;
  }

  const handleAccept = async () => {
    if (!token) return;
    try {
      const res = await accept.mutateAsync({ token });
      const name = res?.householdName ?? '';
      // Kabul edilen household'a otomatik geç — kullanıcı veriyi hemen görsün.
      if (res?.householdId) setActive(res.householdId);
      setDone({ name });
      toast.success(t('accept_toastSuccess', { name: name || '' }));
    } catch (err) {
      setError(resolveApiErrorWithFallback(err, t('common:errorGeneric')));
    }
  };

  return (
    <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <SurfaceCard padding={4} sx={{ maxWidth: 480, textAlign: 'center' }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              mx: 'auto',
              mb: 2,
              bgcolor: (th) => (th.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,139,108,0.06)'),
              color: 'primary.main',
            }}
          >
            <Icon icon={done ? 'mdi:check-bold' : error ? 'mdi:alert-circle-outline' : 'mdi:account-group-outline'} width={32} />
          </Box>
          <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.6rem', mb: 1 }}>
            {t('accept_pageTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            {t('accept_pageSubtitle')}
          </Typography>

          {error ? (
            <Stack spacing={2} alignItems="center">
              <Typography color="error.main" sx={{ fontWeight: 500 }}>
                {error}
              </Typography>
              <Button component={RouterLink} to="/" variant="contained">
                {t('accept_goHome')}
              </Button>
            </Stack>
          ) : done ? (
            <Stack spacing={2} alignItems="center">
              <Typography color="success.main" sx={{ fontWeight: 500 }}>
                {t('accept_toastSuccess', { name: done.name ?? '' })}
              </Typography>
              <Button
                component={RouterLink}
                to="/household"
                variant="contained"
              >
                {t('navLabel')}
              </Button>
            </Stack>
          ) : (
            <Button
              variant="contained"
              size="large"
              onClick={handleAccept}
              disabled={accept.isPending || !token}
              startIcon={accept.isPending ? <CircularProgress size={16} thickness={5} /> : <Icon icon="mdi:check" width={18} />}
            >
              {accept.isPending ? t('accept_loading') : t('accept_button')}
            </Button>
          )}

          {(isAndroid || isIos) && (
            <Stack spacing={1.5} alignItems="center" sx={{ mt: 3, pt: 2.5, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('accept_appPrompt')}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                href={isAndroid ? PLAY_STORE_URL : APP_STORE_URL}
                target="_blank"
                rel="noopener"
                startIcon={<Icon icon={isAndroid ? 'mdi:google-play' : 'mdi:apple'} width={16} />}
              >
                {isAndroid ? t('accept_playBtn') : t('accept_appStoreBtn')}
              </Button>
            </Stack>
          )}
        </SurfaceCard>
      </motion.div>
    </Box>
  );
}
