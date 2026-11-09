import { Alert, Box, Button, CircularProgress, Grid, MenuItem, Select, Stack } from '@mui/material';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardSummaryQuery } from '../api/useDashboard';
import { WelcomeBanner } from '../components/WelcomeBanner';
import { MonthlySummaryCards } from '../components/MonthlySummaryCards';
import { IncomeExpenseChart } from '../components/IncomeExpenseChart';
import { CategoryDonutChart } from '../components/CategoryDonutChart';
import { UpcomingPayments } from '../components/UpcomingPayments';
import { RecentTransactions } from '../components/RecentTransactions';
import { GoalProgressCard } from '../components/GoalProgressCard';
import { BudgetStatusWidget } from '../components/BudgetStatusWidget';
import { PortfolioWidget } from '@features/investments/components/PortfolioWidget';
import { SubscriptionRadarWidget } from '../components/SubscriptionRadarWidget';
import { InsightsWidget } from '../components/InsightsWidget';
import { CashflowWidget } from '../components/CashflowWidget';
import { AiInsightsCard } from '@features/ai/components/AiInsightsCard';

// MonthlySummaryCards içindeki StatCard'lar zaten index 0..3'te kendi stagger'ını
// yapıyor. Buradaki delay tablosu onu takip ediyor — banner 0, cards 0.06..0.24,
// alt grid 0.30'dan başlayıp her widget 0.06 sn arayla geliyor.
const REVEAL = {
  banner: 0,
  cards: 0.24,
  chart: 0.30,
  donut: 0.36,
  upcoming: 0.42,
  goals: 0.48,
  recent: 0.54,
  budget: 0.60,
  ai: 0.66,
} as const;

// MUI X-Charts tooltip'i grafiğin kendi container'ına `position: fixed` + zIndex:modal
// ile portal'lanıyor; her widget bir motion.div (transform) + SurfaceCard (backdrop-filter)
// içinde yaşadığından tooltip o kartın stacking context'ine hapsoluyor ve DOM'da sonra
// gelen kartların ALTINDA boyanıyordu. Hover'da ilgili grid hücresini yukarı kaldırıp
// tooltip'in komşu kartların üstünde kalmasını garanti ediyoruz.
const cellSx = { position: 'relative', '&:hover': { zIndex: 20 } } as const;

// Ay seçici: BudgetsPage'deki dropdown pattern'ini örnek alıyor; common namespace'teki
// uzun ay isim key'lerini kullanır.
const MONTH_KEYS = [
  'month_long_january',
  'month_long_february',
  'month_long_march',
  'month_long_april',
  'month_long_may',
  'month_long_june',
  'month_long_july',
  'month_long_august',
  'month_long_september',
  'month_long_october',
  'month_long_november',
  'month_long_december',
] as const;

function Reveal({ delay, children }: { delay: number; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.2, 0.7, 0.3, 1] }}
      style={{ height: '100%' }}
    >
      {children}
    </motion.div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { isError, refetch, isFetching } = useDashboardSummaryQuery(month, year);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 1480, mx: 'auto' }}>
      {/* WelcomeBanner has its own motion wrapper at delay 0 */}
      <Box sx={{ mb: 4 }}>
        <WelcomeBanner />
      </Box>

      {/* Ay/yıl seçici — BudgetsPage pattern'i */}
      <Stack direction="row" spacing={1.2} sx={{ mb: 3 }} data-tour="dash-month">
        <Select
          size="small"
          value={month}
          aria-label={t('monthLabel')}
          onChange={(e) => setMonth(Number(e.target.value))}
          sx={{ minWidth: 140, '& .MuiSelect-select': { py: 0.7, fontSize: '0.85rem' } }}
        >
          {MONTH_KEYS.map((key, i) => (
            <MenuItem key={key} value={i + 1} sx={{ fontSize: '0.85rem' }}>
              {t(`common:${key}`)}
            </MenuItem>
          ))}
        </Select>
        <Select
          size="small"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          sx={{ minWidth: 90, '& .MuiSelect-select': { py: 0.7, fontSize: '0.85rem' } }}
        >
          {yearOptions.map((y) => (
            <MenuItem key={y} value={y} sx={{ fontSize: '0.85rem' }}>
              {y}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      {isError && (
        <Alert
          severity="error"
          icon={<Icon icon="mdi:alert-circle-outline" width={22} />}
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button
              size="small"
              color="inherit"
              variant="outlined"
              disabled={isFetching}
              startIcon={
                isFetching ? (
                  <CircularProgress size={16} thickness={5} color="inherit" />
                ) : (
                  <Icon icon="mdi:refresh" width={16} />
                )
              }
              onClick={() => void refetch()}
            >
              {t('common:retry')}
            </Button>
          }
        >
          {t('errorTitle')}
        </Alert>
      )}

      {/* MonthlySummaryCards uses per-StatCard index stagger internally */}
      <Box sx={{ mb: 3 }} data-tour="dash-summary">
        <MonthlySummaryCards month={month} year={year} />
      </Box>

      {/* Portföy özeti — yalnız yatırımı olan kullanıcıda görünür */}
      <Box sx={{ mb: 3 }}>
        <PortfolioWidget />
      </Box>

      {/* Abonelik Radarı — yalnız abonelik kuralı olan kullanıcıda görünür */}
      <Box sx={{ mb: 3 }}>
        <SubscriptionRadarWidget />
      </Box>

      {/* Ay sonu tahmini — bilinen gelecek akış yoksa kendini gizler */}
      <Box sx={{ mb: 3 }}>
        <CashflowWidget />
      </Box>

      {/* Kural bazlı içgörüler — içgörü yoksa kendini gizler */}
      <Box sx={{ mb: 3 }}>
        <InsightsWidget />
      </Box>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 8 }} sx={cellSx}>
          <Reveal delay={REVEAL.chart}>
            <IncomeExpenseChart month={month} year={year} />
          </Reveal>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }} sx={cellSx}>
          <Reveal delay={REVEAL.donut}>
            <CategoryDonutChart month={month} year={year} />
          </Reveal>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }} sx={cellSx}>
          <Reveal delay={REVEAL.upcoming}>
            <UpcomingPayments month={month} year={year} />
          </Reveal>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }} sx={cellSx}>
          <Reveal delay={REVEAL.goals}>
            <GoalProgressCard />
          </Reveal>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }} sx={cellSx}>
          <Reveal delay={REVEAL.recent}>
            <RecentTransactions month={month} year={year} />
          </Reveal>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }} sx={cellSx}>
          <Reveal delay={REVEAL.budget}>
            <BudgetStatusWidget month={month} year={year} />
          </Reveal>
        </Grid>

        {/* AI içgörü kartı (premium-gated; kart kendi kilit/teaser durumunu yönetir) */}
        <Grid size={{ xs: 12 }} sx={cellSx}>
          <Reveal delay={REVEAL.ai}>
            <AiInsightsCard month={month} year={year} />
          </Reveal>
        </Grid>
      </Grid>
    </Box>
  );
}
