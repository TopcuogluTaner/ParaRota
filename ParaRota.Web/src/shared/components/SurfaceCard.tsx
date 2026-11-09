import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Adds the corner waypoint marker */
  waypoint?: boolean;
  /** Adds a soft inner shadow line at top — gives 'tear sheet' feel */
  edge?: boolean;
  interactive?: boolean;
  glow?: 'none' | 'go' | 'way' | 'halt';
  padding?: number | string;
  sx?: SxProps<Theme>;
}

export function SurfaceCard({
  children,
  waypoint = false,
  edge = false,
  interactive = false,
  glow = 'none',
  padding = 2.5,
  sx,
}: Props) {
  const glowColor = {
    none: undefined,
    go: 'success.main',
    way: 'warning.main',
    halt: 'error.main',
  }[glow];

  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: 'background.paper',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        p: padding,
        boxShadow: (t) =>
          t.palette.mode === 'dark'
            ? '0 1px 0 rgba(255,255,255,0.02) inset'
            : '0 1px 0 rgba(255,255,255,0.6) inset, 0 1px 2px rgba(43,30,14,0.04)',
        // NOT: backdrop-filter BİLEREK kaldırıldı. Opak `background.paper` üstünde görsel
        // etkisi yoktu ama `position: fixed` torunları için containing-block yaratıyordu —
        // bu yüzden MUI X-Charts tooltip'leri (fixed) viewport yerine karta göre konumlanıp
        // fare koordinatları kartın ofseti kadar kayıyordu. Kaldırınca grafik hover'ları düzelir.
        transition: 'transform .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s, border-color .25s',
        ...(interactive && {
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-1px)',
            borderColor: 'text.disabled',
            boxShadow: (t) =>
              t.palette.mode === 'dark'
                ? '0 8px 24px rgba(0,0,0,0.4)'
                : '0 12px 28px rgba(43,30,14,0.10)',
          },
        }),
        ...(glowColor && {
          boxShadow: (t) =>
            `0 0 0 1px ${alpha(t.palette[glow === 'go' ? 'success' : glow === 'way' ? 'warning' : 'error'].main, 0.22)}, 0 12px 30px ${alpha(t.palette[glow === 'go' ? 'success' : glow === 'way' ? 'warning' : 'error'].main, 0.14)}`,
        }),
        ...sx,
      }}
    >
      {/* Top "tear edge" with route-line dashes */}
      {edge && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: 12,
            left: 14,
            right: 14,
            height: 1,
            opacity: 0.55,
            backgroundImage: (t) =>
              `linear-gradient(to right, transparent 0, transparent 3px, ${t.palette.divider} 3px, ${t.palette.divider} 7px)`,
            backgroundSize: '7px 1px',
            backgroundRepeat: 'repeat-x',
          }}
        />
      )}

      {/* Waypoint marker — bottom-right corner */}
      {waypoint && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'warning.main',
            boxShadow: (t) => `0 0 0 4px ${alpha(t.palette.warning.main, 0.16)}`,
          }}
        />
      )}

      {children}
    </Box>
  );
}
