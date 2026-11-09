import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { formatCurrency, formatNumber } from '@shared/lib/dateFormat';
import { maskMoney } from '@shared/lib/maskMoney';
import { usePrivacyStore } from '@shared/store/usePrivacyStore';

interface Props {
  value: number;
  currency?: string;
  /** If set, value is rendered as a plain number with this unit suffix (e.g. "%"); currency is ignored. */
  unit?: string;
  signed?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'display';
  weight?: 400 | 500 | 600 | 700;
  /** color override; if undefined and signed, uses go/halt automatically */
  tone?: 'auto' | 'go' | 'halt' | 'neutral' | 'mute';
  sx?: SxProps<Theme>;
}

const sizeMap = {
  sm: '0.8rem',
  md: '0.95rem',
  lg: '1.2rem',
  xl: '1.8rem',
  display: '2.6rem',
} as const;

export function Money({
  value,
  currency = 'TRY',
  unit,
  signed = false,
  size = 'md',
  weight = 500,
  tone = 'auto',
  sx,
}: Props) {
  // Gizlilik modu: para tutarları ₺•••• olarak maskelenir.
  // Yüzde/birimli değerler (unit) PARA DEĞİLDİR — maskelenmez (mobil paritesi).
  const hideAmounts = usePrivacyStore((s) => s.hideAmounts);
  const isNegative = value < 0;
  const abs = Math.abs(value);
  const plain = unit ? `${formatNumber(abs)}${unit}` : formatCurrency(abs, currency);
  const formatted = hideAmounts && !unit ? maskMoney(plain) : plain;
  const sign = signed ? (isNegative ? '−' : '+') : isNegative ? '−' : '';

  const colorMap: Record<NonNullable<Props['tone']>, string> = {
    auto: signed ? (isNegative ? 'error.main' : 'success.main') : 'text.primary',
    go: 'success.main',
    halt: 'error.main',
    neutral: 'text.primary',
    mute: 'text.secondary',
  };

  return (
    <Box
      component="span"
      className="pr-num"
      sx={{
        color: colorMap[tone],
        fontSize: sizeMap[size],
        fontWeight: weight,
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '2px',
        ...sx,
      }}
    >
      {sign && (
        <Box component="span" sx={{ opacity: 0.85, fontWeight: 500 }}>
          {sign}
        </Box>
      )}
      {formatted}
    </Box>
  );
}
