import { Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';

type Tone = 'go' | 'way' | 'halt' | 'sky' | 'neutral';

interface Props {
  tone?: Tone;
  variant?: 'soft' | 'outline' | 'solid';
  size?: 'xs' | 'sm' | 'md';
  icon?: ReactNode;
  children: ReactNode;
}

export function SignalBadge({
  tone = 'neutral',
  variant = 'soft',
  size = 'sm',
  icon,
  children,
}: Props) {
  const theme = useTheme();
  const map = {
    go: theme.palette.success.main,
    way: theme.palette.warning.main,
    halt: theme.palette.error.main,
    sky: theme.palette.info.main,
    neutral: theme.palette.text.secondary,
  } as const;
  const color = map[tone];

  const sizeStyles = {
    xs: { px: 0.7, py: 0.15, fontSize: '0.62rem', height: 18, gap: 0.4 },
    sm: { px: 0.9, py: 0.3, fontSize: '0.7rem', height: 22, gap: 0.5 },
    md: { px: 1.2, py: 0.5, fontSize: '0.78rem', height: 28, gap: 0.6 },
  }[size];

  const variantStyles =
    variant === 'solid'
      ? { bgcolor: color, color: '#FBF5E5', borderColor: color }
      : variant === 'outline'
        ? { bgcolor: 'transparent', color, borderColor: alpha(color, 0.45) }
        : { bgcolor: alpha(color, 0.12), color, borderColor: alpha(color, 0.22) };

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: '"Geist Mono", monospace',
        fontWeight: 500,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        borderRadius: '6px',
        border: '1px solid',
        whiteSpace: 'nowrap',
        ...sizeStyles,
        ...variantStyles,
      }}
    >
      {icon && (
        <Box component="span" sx={{ display: 'inline-flex' }}>
          {icon}
        </Box>
      )}
      {children}
    </Box>
  );
}
