import { Box, Stack, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';

/**
 * Login/auth ekranlarında mobil uygulamayı indirme çağrısı — App Store + Google Play
 * mağaza linklerini QR kod olarak gösterir. QR beyaz zeminde (dark mode dahil taranabilir).
 */
const STORES = [
  {
    key: 'ios',
    label: 'App Store',
    icon: 'mdi:apple',
    url: 'https://apps.apple.com/tr/app/pararotam/id6778436063',
  },
  {
    key: 'android',
    label: 'Google Play',
    icon: 'mdi:google-play',
    url: 'https://play.google.com/store/apps/details?id=com.pararotam.mobile',
  },
] as const;

export function AppStoreQr() {
  const { t } = useTranslation('auth');

  return (
    <Stack
      alignItems="center"
      spacing={1.75}
      sx={{ mt: 3.5, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}
    >
      <Typography
        sx={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: '0.62rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'text.disabled',
        }}
      >
        {t('login.getApp', { defaultValue: 'Uygulamayı indir' })}
      </Typography>

      <Stack direction="row" spacing={{ xs: 2.5, sm: 3.5 }} justifyContent="center">
        {STORES.map((s) => (
          <Stack key={s.key} alignItems="center" spacing={1}>
            <Box
              component="a"
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: '#ffffff',
                border: '1px solid',
                borderColor: 'divider',
                lineHeight: 0,
                display: 'block',
                transition: 'transform .2s ease, box-shadow .2s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
              }}
            >
              <QRCodeSVG value={s.url} size={84} level="M" marginSize={0} fgColor="#1B130A" bgColor="#ffffff" />
            </Box>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary' }}>
              <Icon icon={s.icon} width={14} />
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 500 }}>{s.label}</Typography>
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
