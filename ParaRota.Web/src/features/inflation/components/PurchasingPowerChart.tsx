import { useMemo, useId } from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, useReducedMotion } from 'motion/react';
import type { InflationSeriesPointDto } from '@shared/api/types';

interface Props {
  series: InflationSeriesPointDto[];
  /** Eğrinin yükselen mi (enflasyon) yoksa düşen mi (geriye gidiş) olduğunu belirler — renk tonu. */
  rising: boolean;
  startLabel: string;
  endLabel: string;
}

// Koordinat uzayı sabit; SVG width:%100 ile ölçeklenir (banner en-boy oranı korunur).
const W = 600;
const H = 150;
const PAD_Y = 16;

/**
 * Alım gücü eğrisi — tutarın zaman içindeki eşdeğerini tek bakışta gösterir.
 * El yapımı SVG: gradient dolgulu alan + soldan sağa çizilen çizgi + uç noktalar.
 * Rent kartının custom-SVG diliyle uyumlu; @mui/x-charts'a bağımlılık yok.
 */
export function PurchasingPowerChart({ series, rising, startLabel, endLabel }: Props) {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const gradId = useId();

  const tone = rising ? theme.palette.success.main : theme.palette.warning.main;

  const { linePath, areaPath, lastX, lastY } = useMemo(() => {
    // Hook koşulsuz çalışmalı; dejenere girdide (0/1 nokta) güvenli boş değer dön.
    if (series.length < 2) return { linePath: '', areaPath: '', lastX: 0, lastY: 0 };
    const values = series.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const innerW = W;
    const n = series.length;

    const pts = series.map((p, i) => {
      const x = n === 1 ? innerW : (i / (n - 1)) * innerW;
      const y = PAD_Y + (1 - (p.value - min) / span) * (H - PAD_Y * 2);
      return { x, y };
    });

    const line = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(' ');
    const area = `${line} L${innerW},${H} L0,${H} Z`;
    const last = pts[pts.length - 1];
    return { linePath: line, areaPath: area, lastX: last.x, lastY: last.y };
  }, [series]);

  if (series.length < 2) return null;

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ position: 'relative', width: '100%' }}>
        <Box
          component="svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          sx={{ width: '100%', height: { xs: 96, sm: 116 }, display: 'block', overflow: 'visible' }}
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={alpha(tone, 0.26)} />
              <stop offset="100%" stopColor={alpha(tone, 0)} />
            </linearGradient>
          </defs>

          {/* Alan dolgusu — çizgiyle birlikte belirir */}
          <motion.path
            d={areaPath}
            fill={`url(#${gradId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduce ? 0.2 : 0.7, delay: reduce ? 0 : 0.15 }}
            vectorEffect="non-scaling-stroke"
          />
          {/* Çizgi — soldan sağa çizilir */}
          <motion.path
            d={linePath}
            fill="none"
            stroke={tone}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
          {/* Bitiş noktası */}
          <motion.circle
            cx={lastX}
            cy={lastY}
            r={3.5}
            fill={tone}
            vectorEffect="non-scaling-stroke"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: reduce ? 0 : 0.9 }}
            style={{ transformOrigin: `${lastX}px ${lastY}px` }}
          />
        </Box>
      </Box>

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.6, px: 0.2 }}>
        <Typography sx={mono}>{startLabel}</Typography>
        <Typography sx={mono}>{endLabel}</Typography>
      </Stack>
    </Box>
  );
}

const mono = {
  fontFamily: '"Geist Mono", monospace',
  fontSize: '0.66rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'text.disabled',
};
