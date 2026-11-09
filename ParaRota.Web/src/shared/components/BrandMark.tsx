import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import logo from '@/assets/pararotam-logo.png';

interface Props {
  size?: number;
  showWordmark?: boolean;
  variant?: 'default' | 'compact';
}

/**
 * Para Rotam markası — mobil app ikonuyla aynı görsel (cüzdan + pusula).
 * Köşe yuvarlama app-icon oranında (~%22) ki iki platformda aynı dursun.
 */
export function BrandMark({ size = 38, showWordmark = true, variant = 'default' }: Props) {
  const { t } = useTranslation('common');
  // Wordmark ikonla orantılı büyür (38 tabanına göre); küçük boylarda bugünkü ölçü korunur.
  const ratio = Math.max(1, size / 38);
  return (
    <Stack direction="row" spacing={1.4 * ratio} alignItems="center">
      <Box
        component="img"
        src={logo}
        alt=""
        sx={{
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: `${Math.round(size * 0.22)}px`,
          filter: 'drop-shadow(0 2px 8px rgba(11, 42, 74, 0.22))',
        }}
        aria-hidden
      />

      {showWordmark && (
        <Stack spacing={variant === 'compact' ? 0 : 0.1}>
          <Typography
            className="pr-display"
            sx={{
              fontWeight: 600,
              fontSize: `${(variant === 'compact' ? 1.05 : 1.18) * ratio}rem`,
              lineHeight: 1,
              letterSpacing: '-0.025em',
            }}
          >
            {t('appName')}
          </Typography>
          {variant !== 'compact' && (
            <Typography
              variant="overline"
              sx={{ fontSize: `${0.58 * ratio}rem`, lineHeight: 1, color: 'text.disabled' }}
            >
              {t('slogan')}
            </Typography>
          )}
        </Stack>
      )}
    </Stack>
  );
}
