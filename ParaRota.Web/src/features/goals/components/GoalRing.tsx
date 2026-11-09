import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface Props {
  value: number; // 0..100
  size?: number;
  thickness?: number;
  label?: string;
}

export function GoalRing({ value, size = 144, thickness = 10, label }: Props) {
  const theme = useTheme();
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(100, Math.max(0, value)) / 100);

  const tone = value >= 80 ? 'success' : value >= 50 ? 'warning' : 'error';
  const color = theme.palette[tone].main;

  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.palette.divider}
          strokeWidth={thickness}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.7,.3,1)' }}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          className="pr-num"
          sx={{ fontSize: '1.8rem', fontWeight: 600, lineHeight: 1, color: `${tone}.main` }}
        >
          %{Math.round(value)}
        </Typography>
        {label && (
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.62rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mt: 0.4,
            }}
          >
            {label}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
