import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { EmptyState } from '@shared/components/EmptyState';
import { Money } from '@shared/components/Money';
import { dayjs, formatNumber } from '@shared/lib/dateFormat';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { usePrivacyStore } from '@shared/store/usePrivacyStore';
import { useDashboardSummaryQuery } from '../api/useDashboard';
import type { DashboardPeriodProps } from '../types/period';

export function IncomeExpenseChart({ month, year }: DashboardPeriodProps) {
  const theme = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  const isDark = theme.palette.mode === 'dark';
  // Gizlilik modu: tooltip tutarları ₺••••, y-ekseni ••• (mobil AreaTrend paritesi).
  const fmtMoney = useMoneyFmt();
  const hideAmounts = usePrivacyStore((s) => s.hideAmounts);

  const { data, isLoading, isError } = useDashboardSummaryQuery(month, year);

  const trend = data?.monthlyTrend ?? [];
  // Backend month_short_<jan..dec> anahtarı yolluyor; common namespace'ten çevir.
  const months = trend.map((m) => t(m.monthKey, { ns: 'common' }));
  const incomes = trend.map((m) => m.income);
  const expenses = trend.map((m) => m.expense);

  const lastMonth = trend[trend.length - 1];
  const net = lastMonth ? lastMonth.income - lastMonth.expense : 0;
  // Net etiketi seçili ay/yıl'ı yansıtsın (month 1-based → dayjs 0-based).
  const monthLabel = dayjs().month(month - 1).format('MMMM');
  const yearLabel = String(year);

  return (
    <SurfaceCard padding={3} sx={{ height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box>
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
            {t('flow_eyebrow')}
          </Typography>
          <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
            {t('flow_title')}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
            {t('flow_netLabel', { month: monthLabel, year: yearLabel })}
          </Typography>
          <Box>
            <Money value={net} size="lg" weight={600} tone={net >= 0 ? 'go' : 'halt'} />
          </Box>
        </Box>
      </Stack>

      <Stack direction="row" spacing={3} sx={{ mb: 1, ml: 1 }}>
        <LegendDot color={theme.palette.success.main} label={t('common:income')} />
        <LegendDot color={theme.palette.error.main} label={t('common:expense')} />
      </Stack>

      <Box sx={{ height: 280 }}>
        {isLoading ? (
          <Skeleton variant="rounded" width="100%" height="100%" />
        ) : isError && !data ? (
          <EmptyState
            icon="mdi:alert-circle-outline"
            title={t('common:error')}
            description={t('errorTitle')}
          />
        ) : trend.length === 0 ? (
          <EmptyState
            icon="mdi:chart-bar"
            title={t('common:noData')}
          />
        ) : (
          <BarChart
            xAxis={[
              {
                scaleType: 'band',
                data: months,
                tickLabelStyle: {
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: 11,
                  fill: theme.palette.text.secondary,
                },
              },
            ]}
            yAxis={[
              {
                tickLabelStyle: {
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: 10,
                  fill: theme.palette.text.disabled,
                },
                valueFormatter: (v: number) =>
                  hideAmounts ? '•••' : v >= 1000 ? `${formatNumber(v / 1000, 0)}k` : formatNumber(v, 0),
              },
            ]}
            series={[
              {
                data: incomes,
                label: t('common:income'),
                color: theme.palette.success.main,
                valueFormatter: (v: number | null) => (v != null ? fmtMoney(v) : ''),
              },
              {
                data: expenses,
                label: t('common:expense'),
                color: theme.palette.error.main,
                valueFormatter: (v: number | null) => (v != null ? fmtMoney(v) : ''),
              },
            ]}
            borderRadius={6}
            margin={{ top: 16, right: 8, bottom: 28, left: 44 }}
            grid={{ horizontal: true }}
            sx={{
              '& .MuiChartsGrid-line': {
                stroke: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
                strokeDasharray: '3 3',
              },
              '& .MuiChartsAxis-line': { display: 'none' },
              '& .MuiChartsAxis-tick': { display: 'none' },
              '& .MuiChartsLegend-root': { display: 'none' },
            }}
          />
        )}
      </Box>
    </SurfaceCard>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.6}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
      <Typography variant="caption" sx={{ textTransform: 'none', letterSpacing: 0, color: 'text.secondary' }}>
        {label}
      </Typography>
    </Stack>
  );
}
