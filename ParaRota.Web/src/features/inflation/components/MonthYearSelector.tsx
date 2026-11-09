import { Box, ButtonBase, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

const MONTH_SHORT = [
  'month_short_jan', 'month_short_feb', 'month_short_mar', 'month_short_apr',
  'month_short_may', 'month_short_jun', 'month_short_jul', 'month_short_aug',
  'month_short_sep', 'month_short_oct', 'month_short_nov', 'month_short_dec',
] as const;

interface Props {
  /** Üstte mono etiket; verilmezse etiket gösterilmez (ör. ikinci/iç içe seçici). */
  label?: string;
  /** Görünür etiket yokken ekran okuyucu için isim (aria-label). label > a11yLabel. */
  a11yLabel?: string;
  month: number;
  year: number;
  minYear: number;
  maxYear: number;
  onMonth: (m: number) => void;
  onYear: (y: number) => void;
}

/**
 * Ay (12 chip) + yıl seçici. Ay chip'leri kira sayfasındaki desenle aynı; yıl,
 * 2003→bugün gibi geniş aralık için chip yerine kompakt bir seçim alanı (Select).
 */
export function MonthYearSelector({ label, a11yLabel, month, year, minYear, maxYear, onMonth, onYear }: Props) {
  const { t: tCommon } = useTranslation('common');
  const name = label ?? a11yLabel;
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);

  return (
    <Box sx={{ mt: label ? 2.4 : 1.6 }}>
      {label && (
        <Typography
          sx={{
            fontFamily: '"Geist Mono", monospace', fontSize: '0.68rem', letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'text.disabled', mb: 1,
          }}
        >
          {label}
        </Typography>
      )}
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Box role="group" aria-label={name} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, flex: 1, minWidth: 0 }}>
          {MONTH_SHORT.map((key, i) => {
            const on = month === i + 1;
            return (
              <ButtonBase
                key={key}
                onClick={() => onMonth(i + 1)}
                aria-pressed={on}
                sx={{
                  px: 1.25, py: 0.65, borderRadius: 999, border: '1px solid',
                  borderColor: on ? 'success.main' : 'divider',
                  bgcolor: on ? (th) => alpha(th.palette.success.main, 0.12) : 'transparent',
                  color: on ? 'success.main' : 'text.secondary',
                  fontSize: '0.76rem', fontWeight: on ? 700 : 500, fontFamily: 'inherit',
                  transition: 'all .15s', '&:hover': { borderColor: 'success.main' },
                }}
              >
                {tCommon(key)}
              </ButtonBase>
            );
          })}
        </Box>
        <TextField
          select
          value={year}
          onChange={(e) => onYear(Number(e.target.value))}
          size="small"
          className="pr-num"
          aria-label={name}
          slotProps={{ htmlInput: { 'aria-label': name } }}
          sx={{
            width: 92, flexShrink: 0,
            '& .MuiSelect-select': { fontWeight: 700, fontFamily: '"Geist Mono", monospace', py: 0.9 },
          }}
        >
          {years.map((y) => (
            <MenuItem key={y} value={y} className="pr-num" sx={{ fontFamily: '"Geist Mono", monospace' }}>
              {y}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Box>
  );
}
