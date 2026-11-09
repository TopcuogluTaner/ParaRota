import { Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { StatCard } from '@shared/components/StatCard';
import { useDashboardSummaryQuery } from '../api/useDashboard';
import type { DashboardPeriodProps } from '../types/period';

// Bu ay vs geçen ay yüzde değişimi. Geçen ay 0 ise oran tanımsız → undefined dön
// (StatCard delta'yı göstermez). Aksi halde ((now - prev) / |prev|) * 100.
function pctDelta(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function MonthlySummaryCards({ month, year }: DashboardPeriodProps) {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useDashboardSummaryQuery(month, year);

  const income = data?.income ?? 0;
  const expense = data?.expense ?? 0;
  const net = data?.net ?? 0;
  const savingsRate = (data?.savingsRate ?? 0) * 100;

  // monthlyTrend kronolojik 12 ay; son eleman seçili ay, sondan ikinci geçen ay.
  const trend = data?.monthlyTrend ?? [];
  const prev = trend.length >= 2 ? trend[trend.length - 2] : undefined;
  const prevNet = prev ? prev.income - prev.expense : undefined;

  const incomeDelta = prev ? pctDelta(income, prev.income) : undefined;
  // Gider için gerçek işaretli delta verilir; StatCard lowerIsBetter ile rengi tersine çevirir
  // (sayı +%20 kalır ama kırmızı görünür). Böylece gösterilen yüzde gerçekle çelişmez.
  const expenseDelta = prev ? pctDelta(expense, prev.expense) : undefined;
  const netDelta = prevNet !== undefined ? pctDelta(net, prevNet) : undefined;

  const vsPrev = t('vsPrevMonth');
  const incomeHint = incomeDelta !== undefined ? vsPrev : t('stat_hint_thisMonth');
  const expenseHint = expenseDelta !== undefined ? vsPrev : t('stat_hint_thisMonth');
  const netHint = netDelta !== undefined ? vsPrev : t('stat_hint_savedThisMonth');

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          label={t('stat_income')}
          value={income}
          icon="mdi:trending-up"
          tone="go"
          delta={incomeDelta}
          hint={incomeHint}
          index={0}
          loading={isLoading}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          label={t('stat_expense')}
          value={expense}
          icon="mdi:trending-down"
          tone="halt"
          delta={expenseDelta}
          lowerIsBetter
          hint={expenseHint}
          index={1}
          loading={isLoading}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          label={t('stat_net')}
          value={net}
          icon="mdi:scale-balance"
          tone="ink"
          delta={netDelta}
          hint={netHint}
          index={2}
          loading={isLoading}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          label={t('stat_savings')}
          value={savingsRate}
          unit="%"
          icon="mdi:piggy-bank-outline"
          tone="way"
          hint={t('stat_hint_idealSavings')}
          index={3}
          loading={isLoading}
        />
      </Grid>
    </Grid>
  );
}
