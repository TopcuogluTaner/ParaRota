import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { usePaywallStore } from '../store/usePaywallStore';

const FEATURE_KEYS = ['investments', 'receipts', 'household', 'ai'] as const;

// Web'de satın alma YOK (bilinçli karar, 2026-06-11): abonelik yalnız mobil
// mağazalardan (App Store / Google Play) başlatılır. Otorite backend /auth/me
// olduğu için mobilden alınan premium aynı hesapla web'de de geçerlidir.
const APP_STORE_URL = 'https://apps.apple.com/app/id6778436063';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.pararotam.mobile';

export function PaywallDialog() {
  const { t } = useTranslation('paywall');
  const open = usePaywallStore((s) => s.open);
  const hide = usePaywallStore((s) => s.hide);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  const [busy, setBusy] = useState(false);

  /** Mobilden satın alma sonrası web'e dönen kullanıcı için durum tazeleme. */
  async function onCheckStatus() {
    setBusy(true);
    try {
      await fetchUser();
      if (useAuthStore.getState().user?.isPremium) {
        toast.success(t('toast.purchaseSuccess'));
        hide();
      } else {
        toast(t('toast.statusNotPremium'));
      }
    } catch {
      toast.error(t('toast.restoreFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ZoomModal
      open={open}
      onClose={busy ? () => undefined : hide}
      icon="mdi:crown-outline"
      title={t('title')}
      subtitle={t('subtitle')}
      maxWidth={520}
      actions={
        <>
          <Button variant="text" onClick={hide} disabled={busy}>
            {t('cta.close')}
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={onCheckStatus}
            disabled={busy}
            startIcon={<Icon icon="mdi:refresh" width={18} />}
          >
            {t('cta.checkStatus')}
          </Button>
        </>
      }
    >
      {/* Özellik listesi */}
      <Stack spacing={1.25} sx={{ mb: 2 }}>
        {FEATURE_KEYS.map((key) => (
          <Stack key={key} direction="row" spacing={1.25} alignItems="flex-start">
            <Box
              sx={{
                width: 26, height: 26, borderRadius: 1.5, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: (th) => alpha(th.palette.success.main, 0.12),
                color: 'success.main',
              }}
            >
              <Icon icon="mdi:check" width={16} />
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={600}>{t(`features.${key}.title`)}</Typography>
              <Typography variant="caption" color="text.secondary">{t(`features.${key}.desc`)}</Typography>
            </Box>
          </Stack>
        ))}
      </Stack>

      {/* Mobilden satın alma yönlendirmesi */}
      <Box
        sx={{
          textAlign: 'center', py: 2.5, px: 2, borderRadius: 2,
          border: (th) => `1.5px solid ${th.palette.divider}`,
          bgcolor: (th) => alpha(th.palette.success.main, 0.04),
        }}
      >
        <Icon icon="mdi:cellphone-arrow-down" width={32} style={{ opacity: 0.8 }} />
        <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.6 }}>
          {t('mobileOnly.notice')}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
          {t('plan.staticHint')}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="center" sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener"
            startIcon={<Icon icon="mdi:apple" width={18} />}
          >
            App Store
          </Button>
          <Button
            variant="outlined"
            size="small"
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener"
            startIcon={<Icon icon="mdi:google-play" width={16} />}
          >
            Google Play
          </Button>
        </Stack>
      </Box>

      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2, lineHeight: 1.5 }}>
        {t('legal.autoRenew')}
      </Typography>
      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
        <RouterLink to="/terms" target="_blank" style={{ fontSize: 12 }}>{t('legal.terms')}</RouterLink>
        <Typography variant="caption" color="text.disabled">·</Typography>
        <RouterLink to="/privacy" target="_blank" style={{ fontSize: 12 }}>{t('legal.privacy')}</RouterLink>
      </Stack>
    </ZoomModal>
  );
}
