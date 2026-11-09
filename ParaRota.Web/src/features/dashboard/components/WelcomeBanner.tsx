import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { dayjs } from '@shared/lib/dateFormat';

export function WelcomeBanner() {
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation('dashboard');
  const hour = new Date().getHours();
  const greetingKey =
    hour < 5
      ? 'greeting_night'
      : hour < 12
        ? 'greeting_morning'
        : hour < 18
          ? 'greeting_afternoon'
          : 'greeting_evening';
  const greeting = t(greetingKey);
  const name = user?.firstName || t('travelerName');
  const today = dayjs().format('D MMMM YYYY, dddd');
  const day = dayjs().date();
  const totalDays = dayjs().daysInMonth();
  const monthLabel = dayjs().format('MMMM YYYY');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1.6}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.68rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mb: 0.5,
            }}
          >
            {today}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Fraunces", serif',
              fontWeight: 400,
              fontSize: { xs: '1.55rem', md: '1.8rem' },
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {greeting},{' '}
            <Box component="span" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
              {name}
            </Box>
            .
          </Typography>
        </Box>

        {/* Mini route progress chip */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 1.3,
            py: 0.8,
            borderRadius: 1.6,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.05),
            flexShrink: 0,
          }}
        >
          <Icon icon="mdi:map-marker-path" width={16} style={{ color: 'var(--pr-go)' }} />
          <Box>
            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.56rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                lineHeight: 1,
                mb: 0.3,
              }}
            >
              {t('activeRouteEyebrow')}
            </Typography>
            <Typography
              sx={{ fontFamily: '"Fraunces", serif', fontSize: '0.88rem', fontWeight: 500, lineHeight: 1 }}
            >
              {monthLabel} · <Box component="span" className="pr-num" sx={{ fontWeight: 600 }}>{day}/{totalDays}</Box>
            </Typography>
          </Box>
        </Box>
      </Stack>
    </motion.div>
  );
}
