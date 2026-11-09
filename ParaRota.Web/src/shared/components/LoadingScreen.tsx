import { Box, Stack, Typography } from '@mui/material';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from './BrandMark';

interface Props {
  message?: string;
}

export function LoadingScreen({ message }: Props) {
  const { t } = useTranslation('common');
  const displayMessage = message ?? t('loadingRoute');
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        zIndex: 9999,
      }}
    >
      <Stack alignItems="center" spacing={3}>
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <BrandMark size={56} showWordmark={false} />
        </motion.div>

        {/* Route line drawing animation */}
        <Box sx={{ width: 220, height: 2, position: 'relative', borderRadius: 1, overflow: 'hidden', bgcolor: 'divider' }}>
          <Box
            component={motion.div}
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            sx={{
              position: 'absolute',
              inset: 0,
              background: (t) =>
                `linear-gradient(90deg, transparent, ${t.palette.primary.main}, transparent)`,
            }}
          />
        </Box>

        <Typography
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: '0.72rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'text.disabled',
          }}
        >
          {displayMessage}
        </Typography>
      </Stack>
    </Box>
  );
}
