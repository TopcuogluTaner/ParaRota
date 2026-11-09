import { Box, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export interface ModuleCardProps {
  id: string;
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  /** Module-specific accent renk. Kart hover/active'de bu renk kullanılır. */
  tone: 'primary' | 'success' | 'warning' | 'error' | 'info';
  active: boolean;
  disabled?: boolean;
  onClick: (id: string) => void;
  index?: number;
}

export function ModuleCard({
  id,
  icon,
  eyebrow,
  title,
  description,
  tone,
  active,
  disabled = false,
  onClick,
  index = 0,
}: ModuleCardProps) {
  const { t } = useTranslation('pages');
  const theme = useTheme();
  const palette = theme.palette[tone];
  const accent = palette.main;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease: [0.2, 0.7, 0.3, 1] }}
      whileHover={!disabled ? { y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.985 } : undefined}
      style={{ height: '100%' }}
    >
      <Box
        component="button"
        type="button"
        onClick={() => !disabled && onClick(id)}
        disabled={disabled}
        sx={{
          all: 'unset',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          position: 'relative',
          textAlign: 'left',
          p: { xs: 2, sm: 2.4, md: 2.6 },
          borderRadius: 2.2,
          border: '1px solid',
          borderColor: active ? accent : 'divider',
          bgcolor: active
            ? alpha(accent, theme.palette.mode === 'dark' ? 0.12 : 0.06)
            : 'background.paper',
          opacity: disabled ? 0.55 : 1,
          overflow: 'hidden',
          isolation: 'isolate',
          transition: 'border-color .15s, background-color .15s, box-shadow .25s',
          boxShadow: active
            ? `0 0 0 1px ${alpha(accent, 0.5)}, 0 12px 28px ${alpha(accent, 0.14)}`
            : theme.palette.mode === 'dark'
              ? '0 1px 0 rgba(255,255,255,0.02) inset'
              : '0 1px 0 rgba(255,255,255,0.6) inset, 0 1px 2px rgba(43,30,14,0.04)',
          '&:hover': !disabled
            ? {
                borderColor: alpha(accent, 0.6),
                boxShadow: `0 0 0 1px ${alpha(accent, 0.35)}, 0 8px 22px ${alpha(accent, 0.1)}`,
              }
            : undefined,
          // Aktif kartta sol kenar railı
          '&::before': active
            ? {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 10,
                bottom: 10,
                width: 3,
                borderRadius: 999,
                bgcolor: accent,
              }
            : undefined,
        }}
      >
        {/* Decorative inner arc */}
        <Box
          aria-hidden
          component="svg"
          viewBox="0 0 160 160"
          sx={{
            position: 'absolute',
            right: -28,
            bottom: -36,
            width: 160,
            height: 160,
            opacity: theme.palette.mode === 'dark' ? 0.08 : 0.06,
            color: accent,
            pointerEvents: 'none',
          }}
        >
          <circle cx="80" cy="80" r="60" stroke="currentColor" strokeWidth="0.7" fill="none" />
          <circle cx="80" cy="80" r="38" stroke="currentColor" strokeWidth="0.7" fill="none" />
          <line x1="80" y1="20" x2="80" y2="140" stroke="currentColor" strokeWidth="0.5" />
          <line x1="20" y1="80" x2="140" y2="80" stroke="currentColor" strokeWidth="0.5" />
        </Box>

        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.4, flexShrink: 0, position: 'relative' }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(accent, 0.14),
              color: accent,
              flexShrink: 0,
            }}
          >
            <Icon icon={icon} width={18} />
          </Box>
          {disabled && (
            <Box
              sx={{
                px: 0.8,
                py: 0.2,
                borderRadius: 0.8,
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.58rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: 'text.disabled',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: (th) => alpha(th.palette.text.primary, th.palette.mode === 'dark' ? 0.04 : 0.025),
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {t('admin.comingSoon')}
            </Box>
          )}
        </Stack>

        <Box sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.6rem',
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
              fontSize: { xs: '1.02rem', sm: '1.08rem', md: '1.12rem' },
              lineHeight: 1.18,
              mb: 0.6,
              wordBreak: 'break-word',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              textTransform: 'none',
              letterSpacing: 0,
              fontSize: '0.78rem',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {description}
          </Typography>
        </Box>

        {active && !disabled && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              right: 12,
              top: 12,
              width: 20,
              height: 20,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: accent,
              color: 'common.white',
              boxShadow: `0 0 0 3px ${alpha(accent, 0.2)}`,
            }}
          >
            <Icon icon="mdi:check" width={12} />
          </Box>
        )}
      </Box>
    </motion.div>
  );
}
