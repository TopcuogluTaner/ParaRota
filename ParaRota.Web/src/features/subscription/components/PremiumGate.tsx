import type { ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useEntitlement } from '../hooks/useEntitlement';
import { usePaywallStore, type PremiumFeature } from '../store/usePaywallStore';

interface Props {
  feature: PremiumFeature;
  children: ReactNode;
}

/**
 * Premium değilse içeriği gizler, kilitli bir tanıtım kartı + "Premium'a Geç"
 * CTA'sı gösterir. UI gizleme YETMEZ — backend de [RequirePremium] ile korur.
 */
export function PremiumGate({ feature, children }: Props) {
  const { isPremium } = useEntitlement();
  if (isPremium) return <>{children}</>;
  return <LockedView feature={feature} />;
}

function LockedView({ feature }: { feature: PremiumFeature }) {
  const { t } = useTranslation('paywall');
  const show = usePaywallStore((s) => s.show);
  const { isInTrial, trialDaysLeft } = useEntitlement();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', px: 3 }}>
      <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center', maxWidth: 420 }}>
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

        <Typography variant="overline" color="text.secondary">{t('locked.eyebrow')}</Typography>
        <Typography variant="h5" fontWeight={700}>{t(`features.${feature}.title`)}</Typography>
        <Typography variant="body2" color="text.secondary">{t(`features.${feature}.desc`)}</Typography>

        {isInTrial && trialDaysLeft != null ? (
          <Typography variant="caption" color="text.disabled">
            {t('trial.daysLeft', { count: trialDaysLeft })}
          </Typography>
        ) : null}

        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<Icon icon="mdi:crown-outline" width={20} />}
          onClick={() => show(feature)}
          sx={{ mt: 1, borderRadius: 2 }}
        >
          {t('cta.unlock')}
        </Button>
      </Stack>
    </Box>
  );
}
