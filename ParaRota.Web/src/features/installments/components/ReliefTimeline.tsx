import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { MONTH_SHORT_KEYS } from '../lib/installmentMath';

export interface ReliefGroup {
  y: number;
  /** 0-indexed ay. */
  m: number;
  amount: number;
}

interface Props {
  groups: ReliefGroup[];
}

/**
 * Rahatlama takvimi — aktif planlar bitiş ayına göre gruplanır: "o ay bitince
 * aylık yük ne kadar azalır" (örn. "Eyl 2026 → +₺2.000/ay").
 */
export function ReliefTimeline({ groups }: Props) {
  const { t } = useTranslation(['installments', 'common']);
  const fmtMoney = useMoneyFmt(); // gizlilik modunda tutarları maskeler
  if (groups.length === 0) return null;

  return (
    <SurfaceCard padding={0} edge sx={{ p: { xs: 2, sm: 2.4 }, pt: { xs: 2.6, sm: 3 } }}>
      <Stack direction="row" spacing={0.9} alignItems="center" sx={{ mb: 1.6 }}>
        <Box sx={{ color: 'success.main', display: 'grid', placeItems: 'center' }}>
          <Icon icon="mdi:weather-sunset-up" width={17} />
        </Box>
        <Typography
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: '0.62rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'text.disabled',
            lineHeight: 1.5,
          }}
        >
          {t('relief_title')}
        </Typography>
      </Stack>

      <Stack>
        {groups.map((g, i) => (
          <Stack
            key={`${g.y}-${g.m}`}
            direction="row"
            alignItems="center"
            spacing={1.2}
            sx={{
              py: 1,
              borderTop: i === 0 ? 'none' : '1px dashed',
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                flexShrink: 0,
                bgcolor: (th) => alpha(th.palette.success.main, 0.25 + Math.min(i * 0.12, 0.6)),
                border: '1.5px solid',
                borderColor: 'success.main',
              }}
            />
            <Typography variant="body2" sx={{ flex: 1, color: 'text.secondary', minWidth: 0 }} noWrap>
              {t(`common:${MONTH_SHORT_KEYS[g.m]}`)} {g.y}
            </Typography>
            <Typography
              className="pr-num"
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontWeight: 600,
                fontSize: '0.84rem',
                color: 'success.main',
                whiteSpace: 'nowrap',
              }}
            >
              + {fmtMoney(g.amount)}{t('perMonth')}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </SurfaceCard>
  );
}
