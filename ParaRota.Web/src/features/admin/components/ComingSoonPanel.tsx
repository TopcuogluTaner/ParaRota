import { Box, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';

interface Props {
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  tone: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export function ComingSoonPanel({ icon, eyebrow, title, description, tone }: Props) {
  const { t } = useTranslation('pages');
  const theme = useTheme();
  const accent = theme.palette[tone].main;

  return (
    <SurfaceCard padding={4} sx={{ position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
      {/* Decorative compass + faint route lines */}
      <Box
        aria-hidden
        component="svg"
        viewBox="0 0 280 280"
        sx={{
          position: 'absolute',
          right: -60,
          top: -60,
          width: 320,
          height: 320,
          opacity: theme.palette.mode === 'dark' ? 0.06 : 0.045,
          color: accent,
          pointerEvents: 'none',
        }}
      >
        <circle cx="140" cy="140" r="110" stroke="currentColor" strokeWidth="0.6" fill="none" />
        <circle cx="140" cy="140" r="80" stroke="currentColor" strokeWidth="0.6" fill="none" />
        <circle cx="140" cy="140" r="50" stroke="currentColor" strokeWidth="0.6" fill="none" />
        <line x1="140" y1="30" x2="140" y2="250" stroke="currentColor" strokeWidth="0.5" />
        <line x1="30" y1="140" x2="250" y2="140" stroke="currentColor" strokeWidth="0.5" />
        <line x1="62" y1="62" x2="218" y2="218" stroke="currentColor" strokeWidth="0.4" />
        <line x1="218" y1="62" x2="62" y2="218" stroke="currentColor" strokeWidth="0.4" />
      </Box>

      <Stack alignItems="center" spacing={2} sx={{ py: 4, position: 'relative' }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(accent, 0.14),
            color: accent,
          }}
        >
          <Icon icon={icon} width={28} />
        </Box>

        <Box>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.66rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mb: 0.4,
            }}
          >
            {eyebrow}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Fraunces", serif',
              fontWeight: 500,
              fontSize: '1.7rem',
              lineHeight: 1.15,
            }}
          >
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, maxWidth: 480, mx: 'auto' }}>
            {description}
          </Typography>
        </Box>

        <Box
          sx={{
            px: 1.4,
            py: 0.6,
            borderRadius: 999,
            fontFamily: '"Geist Mono", monospace',
            fontSize: '0.7rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 600,
            color: accent,
            border: '1px solid',
            borderColor: alpha(accent, 0.5),
            bgcolor: alpha(accent, 0.1),
          }}
        >
          {t('admin.comingSoon')}
        </Box>
      </Stack>
    </SurfaceCard>
  );
}
