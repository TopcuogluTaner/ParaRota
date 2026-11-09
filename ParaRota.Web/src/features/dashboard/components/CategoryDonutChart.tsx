import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { useTheme } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { Money } from '@shared/components/Money';
import { formatNumber } from '@shared/lib/dateFormat';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { useDashboardSummaryQuery } from '../api/useDashboard';
import type { DashboardPeriodProps } from '../types/period';

export function CategoryDonutChart({ month, year }: DashboardPeriodProps) {
  const theme = useTheme();
  const { t } = useTranslation('dashboard');
  const fmtMoney = useMoneyFmt(); // gizlilik modunda tooltip tutarlarını maskeler
  const { data, isLoading } = useDashboardSummaryQuery(month, year);

  const breakdown = data?.topExpensesByCategory ?? [];
  const total = data?.expense ?? 0;
  const top = breakdown[0];

  return (
    <SurfaceCard padding={3} sx={{ height: '100%' }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: '0.66rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'text.disabled',
            mb: 0.5,
          }}
        >
          {t('donut_eyebrow')}
        </Typography>
        <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
          {t('donut_title')}
        </Typography>
      </Box>

      {isLoading ? (
        <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
          <Skeleton variant="circular" width={192} height={192} />
          <Stack spacing={1} sx={{ width: '100%' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Stack key={i} direction="row" alignItems="center" spacing={1.2}>
                <Skeleton variant="circular" width={10} height={10} />
                <Skeleton variant="text" width="55%" height={18} />
                <Box sx={{ flex: 1 }} />
                <Skeleton variant="text" width={40} height={18} />
              </Stack>
            ))}
          </Stack>
        </Stack>
      ) : breakdown.length === 0 ? (
        <Box
          sx={{
            py: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            color: 'text.disabled',
            textAlign: 'center',
          }}
        >
          <Icon icon="mdi:chart-donut" width={32} />
          <Typography variant="caption" sx={{ textTransform: 'none', letterSpacing: 0, maxWidth: 220 }}>
            {t('donut_empty')}
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ position: 'relative', height: 220 }}>
            <PieChart
              series={[
                {
                  data: breakdown.map((c, i) => ({
                    id: i,
                    value: c.amount,
                    label: c.name,
                    color: c.color,
                  })),
                  innerRadius: 64,
                  outerRadius: 96,
                  paddingAngle: 1.5,
                  cornerRadius: 3,
                  startAngle: -90,
                  endAngle: 270,
                  valueFormatter: (item) => fmtMoney(item.value),
                },
              ]}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              sx={{ '& .MuiChartsLegend-root': { display: 'none' } }}
            />

            <Stack
              alignItems="center"
              spacing={0.2}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                textAlign: 'center',
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '0.6rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'text.disabled',
                }}
              >
                {t('donut_totalExpense')}
              </Typography>
              <Money value={total} size="lg" weight={600} tone="neutral" />
            </Stack>
          </Box>

          <Stack spacing={0.8} sx={{ mt: 2 }}>
            {breakdown.slice(0, 5).map((c) => (
              <Stack key={c.categoryId} direction="row" alignItems="center" spacing={1.2}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.84rem', flex: 1, color: 'text.primary' }}>{c.name}</Typography>
                <Typography
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: '0.78rem',
                    color: 'text.secondary',
                    minWidth: 38,
                    textAlign: 'right',
                  }}
                >
                  %{formatNumber(c.share * 100, 1)}
                </Typography>
              </Stack>
            ))}
          </Stack>

          {top && (
            <>
              <Box className="pr-route-line" sx={{ my: 1.5, opacity: 0.6 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
                {t('donut_topSpender')}:{' '}
                <strong style={{ color: theme.palette.text.primary }}>{top.name}</strong> ·{' '}
                %{formatNumber(top.share * 100, 0)}
              </Typography>
            </>
          )}
        </>
      )}
    </SurfaceCard>
  );
}
