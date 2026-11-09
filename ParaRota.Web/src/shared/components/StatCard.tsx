import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { Money } from './Money';

type Tone = 'go' | 'way' | 'halt' | 'sky' | 'ink';

interface Props {
  label: string;
  value: number;
  currency?: string;
  /** If set, value is rendered as a plain number with this unit suffix (e.g. "%"); currency is ignored. */
  unit?: string;
  delta?: number; // percent change vs previous period (gerçek işaretli değer)
  /** Gider gibi metriklerde artış KÖTÜdür: sayı gerçek kalır ama renk/iyilik tersine döner. */
  lowerIsBetter?: boolean;
  icon?: string; // iconify
  tone?: Tone;
  hint?: string;
  signed?: boolean;
  index?: number; // stagger
  /** When true, renders skeleton placeholders instead of the value. */
  loading?: boolean;
}

const toneMap = {
  go: 'success',
  way: 'warning',
  halt: 'error',
  sky: 'info',
  ink: 'primary',
} as const;

export function StatCard({
  label,
  value,
  currency = 'TRY',
  unit,
  delta,
  lowerIsBetter = false,
  icon,
  tone = 'ink',
  hint,
  signed = false,
  index = 0,
  loading = false,
}: Props) {
  const theme = useTheme();
  const muiKey = toneMap[tone];
  const color = theme.palette[muiKey].main;
  const colorSoft = theme.palette[muiKey].light;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.2, 0.7, 0.3, 1] }}
      style={{ height: '100%' }}
    >
      <Box
        sx={{
          position: 'relative',
          height: '100%',
          borderRadius: 3,
          border: '1px solid',
          borderColor: alpha(color, theme.palette.mode === 'dark' ? 0.22 : 0.18),
          background: `linear-gradient(150deg, ${alpha(color, theme.palette.mode === 'dark' ? 0.16 : 0.08)} 0%, ${alpha(colorSoft, theme.palette.mode === 'dark' ? 0.04 : 0.02)} 60%, transparent 100%), ${theme.palette.background.paper}`,
          p: 2.5,
          overflow: 'hidden',
          isolation: 'isolate',
        }}
      >
        {/* Decorative compass-rose arc */}
        <Box
          aria-hidden
          component="svg"
          viewBox="0 0 200 200"
          sx={{
            position: 'absolute',
            right: -28,
            bottom: -36,
            width: 180,
            height: 180,
            opacity: theme.palette.mode === 'dark' ? 0.10 : 0.08,
            color,
          }}
        >
          <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.8" fill="none" />
          <circle cx="100" cy="100" r="55" stroke="currentColor" strokeWidth="0.8" fill="none" />
          <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="0.8" fill="none" />
          <line x1="100" y1="20" x2="100" y2="180" stroke="currentColor" strokeWidth="0.6" />
          <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" strokeWidth="0.6" />
        </Box>

        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.66rem',
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: alpha(color, 0.9),
              fontWeight: 500,
            }}
          >
            {label}
          </Typography>
          {icon && (
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.4,
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha(color, 0.12),
                color,
              }}
            >
              <Icon icon={icon} width={18} />
            </Box>
          )}
        </Stack>

        {loading ? (
          <Skeleton variant="text" width="60%" height={42} sx={{ borderRadius: 1 }} />
        ) : (
          <Money value={value} currency={currency} unit={unit} signed={signed} size="xl" weight={600} tone="neutral" />
        )}

        {(delta !== undefined || hint) && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.6 }}>
            {delta !== undefined && (() => {
              // Sayı gerçek işaretiyle gösterilir; "iyilik" (renk) metriğe göre belirlenir.
              const isGood = lowerIsBetter ? delta <= 0 : delta >= 0;
              const goodColor = isGood ? theme.palette.success.main : theme.palette.error.main;
              return (
                <Stack
                  direction="row"
                  spacing={0.3}
                  alignItems="center"
                  sx={{
                    px: 0.8,
                    py: 0.2,
                    borderRadius: 1,
                    bgcolor: alpha(goodColor, 0.12),
                    color: isGood ? 'success.main' : 'error.main',
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}
                >
                  <Icon icon={delta >= 0 ? 'mdi:trending-up' : 'mdi:trending-down'} width={14} />
                  <Box>
                    {delta >= 0 ? '+' : ''}
                    {delta.toFixed(1)}%
                  </Box>
                </Stack>
              );
            })()}
            {hint && (
              <Typography variant="caption" sx={{ textTransform: 'none', letterSpacing: 0, color: 'text.secondary' }}>
                {hint}
              </Typography>
            )}
          </Stack>
        )}
      </Box>
    </motion.div>
  );
}
