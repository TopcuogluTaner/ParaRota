import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  InputAdornment,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { SectionHeader } from '@shared/components/SectionHeader';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { EmptyState } from '@shared/components/EmptyState';
import { Money } from '@shared/components/Money';
import { SignalBadge } from '@shared/components/SignalBadge';
import { formatNumber } from '@shared/lib/dateFormat';
import { usePrivacyStore } from '@shared/store/usePrivacyStore';
import { parseAmount } from '@shared/lib/parseAmount';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import type { PayrollMonthDto, PayrollResultDto, RecurringRuleDto } from '@shared/api/types';
import { useRecurringRulesQuery } from '@features/recurring/api/useRecurringRules';
import { usePayrollQuery, usePayrollYearsQuery } from '../api/usePayroll';
import { PayrollSetupModal } from '../components/PayrollSetupModal';
import { PayrollManageModal } from '../components/PayrollManageModal';

const FALLBACK_YEAR = 2026;

const MONTH_KEYS = [
  'month_short_jan', 'month_short_feb', 'month_short_mar', 'month_short_apr',
  'month_short_may', 'month_short_jun', 'month_short_jul', 'month_short_aug',
  'month_short_sep', 'month_short_oct', 'month_short_nov', 'month_short_dec',
] as const;

export function PayrollPage() {
  const { t } = useTranslation(['payroll', 'common']);

  const yearsQuery = usePayrollYearsQuery();
  const year = yearsQuery.data?.length ? Math.max(...yearsQuery.data) : FALLBACK_YEAR;

  const [grossInput, setGrossInput] = useState('');
  const [submitted, setSubmitted] = useState(0);
  const { data, isFetching, isError, error } = usePayrollQuery(submitted, year);

  // Kurulu maaş otomatiği var mı? (varsa kurulum CTA'sı yerine yönetim kartı gösterilir)
  const rulesQuery = useRecurringRulesQuery(true);
  const salaryRule = (rulesQuery.data ?? []).find((r) => r.payrollGrossMonthly != null);

  const [setupOpen, setSetupOpen] = useState(false);
  const [manageRule, setManageRule] = useState<RecurringRuleDto | null>(null);

  const compute = () => {
    const g = parseAmount(grossInput);
    if (!(Number.isFinite(g) && g > 0)) {
      toast.error(t('payroll:invalidGross'), { id: 'payroll-validate' });
      return;
    }
    setSubmitted(g);
  };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 1280, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('payroll:eyebrow')}
        title={t('payroll:title')}
        description={t('payroll:description')}
      />

      {/* Giriş şeridi */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <SurfaceCard padding={0} sx={{ p: { xs: 2.2, sm: 2.6 }, mb: 2.5 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.6}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <TextField
              label={t('payroll:grossLabel')}
              placeholder={t('payroll:grossPlaceholder')}
              value={grossInput}
              onChange={(e) => setGrossInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') compute(); }}
              fullWidth
              size="medium"
              slotProps={{
                input: {
                  inputMode: 'decimal',
                  startAdornment: <InputAdornment position="start">₺</InputAdornment>,
                  sx: { fontFamily: '"Geist Mono", monospace', fontWeight: 600 },
                },
              }}
              sx={{ flex: 1 }}
            />
            <Stack direction="row" spacing={1.4} alignItems="center" sx={{ flexShrink: 0 }}>
              <SignalBadge tone="neutral" size="md" variant="outline">
                {t('payroll:yearLabel')} {year}
              </SignalBadge>
              <Button
                variant="contained"
                onClick={compute}
                disabled={isFetching}
                startIcon={
                  isFetching ? (
                    <CircularProgress size={16} thickness={5} />
                  ) : (
                    <Icon icon="mdi:calculator-variant-outline" width={18} />
                  )
                }
                sx={{ px: 3, py: 1.2, whiteSpace: 'nowrap' }}
              >
                {t('payroll:calculate')}
              </Button>
            </Stack>
          </Stack>
        </SurfaceCard>
      </motion.div>

      {/* Kurulu otomatik maaş — hesaplamadan bağımsız her zaman görünür */}
      {salaryRule && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <AutomationActiveCard rule={salaryRule} onManage={() => setManageRule(salaryRule)} />
        </motion.div>
      )}

      {submitted <= 0 ? (
        <EmptyState
          icon="mdi:cash-multiple"
          title={t('payroll:emptyTitle')}
          description={t('payroll:emptyHint')}
        />
      ) : isFetching && !data ? (
        <ResultSkeleton />
      ) : isError && !data ? (
        <EmptyState
          icon="mdi:alert-circle-outline"
          title={t('payroll:errorTitle')}
          description={getErrorMessage(error, t('common:errorGeneric'))}
          action={
            <Button variant="contained" onClick={compute} startIcon={<Icon icon="mdi:refresh" width={18} />}>
              {t('payroll:retry')}
            </Button>
          }
        />
      ) : data ? (
        <Grid container spacing={2.5} key={`${submitted}-${data.year}`}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Stack spacing={2.5}>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <SummaryHero data={data} />
              </motion.div>
              {!salaryRule && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.08 }}
                >
                  <SetupCtaCard onClick={() => setSetupOpen(true)} />
                </motion.div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.14 }}
              >
                <NoteBox />
              </motion.div>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, lg: 7 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06 }}>
              <MonthsTable data={data} />
            </motion.div>
          </Grid>
        </Grid>
      ) : null}

      {data && (
        <PayrollSetupModal
          open={setupOpen}
          onClose={() => setSetupOpen(false)}
          gross={submitted}
          result={data}
        />
      )}
      <PayrollManageModal open={manageRule !== null} rule={manageRule} onClose={() => setManageRule(null)} />
    </Box>
  );
}

/* ── Özet (hero): ortalama aylık net + net oranı + yıllık özet ─────────────── */

function SummaryHero({ data }: { data: PayrollResultDto }) {
  const { t } = useTranslation('payroll');
  const avgNet = data.annualNet / Math.max(1, data.months.length);
  const annualDeductions = data.annualGross - data.annualNet;
  const netRate = data.annualGross > 0 ? Math.round((data.annualNet / data.annualGross) * 100) : 0;

  return (
    <SurfaceCard padding={0} sx={{ overflow: 'hidden' }}>
      <Box sx={{ p: { xs: 2.2, sm: 2.6 }, bgcolor: (th) => alpha(th.palette.success.main, 0.07) }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'success.main',
                color: 'success.contrastText',
              }}
            >
              <Icon icon="mdi:wallet-outline" width={16} />
            </Box>
            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.68rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              {t('result_avgNet')}
            </Typography>
          </Stack>
          <SignalBadge tone="go" size="sm" variant="soft" icon={<Icon icon="mdi:trending-up" width={13} />}>
            %{netRate} {t('netRateLabel')}
          </SignalBadge>
        </Stack>
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Money value={avgNet} size="display" weight={600} tone="go" />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('perMonth')}
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2.2, sm: 2.6 }, pt: 2, pb: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: '0.66rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'text.disabled',
            mb: 1.2,
          }}
        >
          {t('annualTitle')}
        </Typography>
        {/* Elde tutulan (net) vs kesinti oranı — tek bakışta */}
        <Box
          aria-hidden
          sx={{ display: 'flex', gap: '3px', height: 8, borderRadius: 99, overflow: 'hidden', mb: 1 }}
        >
          <Box sx={{ flex: Math.max(netRate, 1), bgcolor: 'success.main', borderRadius: 99 }} />
          <Box
            sx={{
              flex: Math.max(100 - netRate, 1),
              bgcolor: (th) => alpha(th.palette.error.main, 0.85),
              borderRadius: 99,
            }}
          />
        </Box>
        <AnnualRow dotColor="text.disabled" label={t('result_annualGross')} value={data.annualGross} />
        <AnnualRow dotColor="success.main" label={t('result_annualNet')} value={data.annualNet} tone="go" />
        <AnnualRow
          dotColor="error.main"
          label={t('result_annualDeductions')}
          value={-annualDeductions}
          tone="halt"
          last
        />
      </Box>
    </SurfaceCard>
  );
}

function AnnualRow({
  dotColor,
  label,
  value,
  tone = 'neutral',
  last = false,
}: {
  dotColor: string;
  label: string;
  value: number;
  tone?: 'go' | 'halt' | 'neutral';
  last?: boolean;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.2}
      sx={{ py: 1.2, borderBottom: last ? 'none' : '1px dashed', borderColor: 'divider' }}
    >
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0 }} />
      <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1 }}>
        {label}
      </Typography>
      <Money value={value} size="sm" weight={600} tone={tone} />
    </Stack>
  );
}

/* ── Maaş otomatiği kartları ───────────────────────────────────────────────── */

function AutomationActiveCard({ rule, onManage }: { rule: RecurringRuleDto; onManage: () => void }) {
  const { t } = useTranslation('payroll');
  return (
    <SurfaceCard
      padding={0}
      sx={{
        p: { xs: 1.8, sm: 2 },
        mb: 2.5,
        borderColor: (th) => alpha(th.palette.success.main, 0.3),
        bgcolor: (th) => alpha(th.palette.success.main, 0.04),
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.6}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.4,
            display: 'grid',
            placeItems: 'center',
            bgcolor: (th) => alpha(th.palette.success.main, 0.14),
            color: 'success.main',
            flexShrink: 0,
          }}
        >
          <Icon icon="mdi:check-decagram-outline" width={22} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.92rem' }}>
              {t('automationSetupNote')}
            </Typography>
            <SignalBadge tone="go" size="xs" variant="soft">
              {t('automationActive')}
            </SignalBadge>
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            <Money value={rule.payrollGrossMonthly ?? 0} currency={rule.currency} size="sm" weight={600} tone="neutral" />{' '}
            {t('automationGrossSuffix')} · {t('automationManageHint')}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={onManage}
          startIcon={<Icon icon="mdi:cog-outline" width={16} />}
          sx={{ flexShrink: 0 }}
        >
          {t('manageCta')}
        </Button>
      </Stack>
    </SurfaceCard>
  );
}

function SetupCtaCard({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation('payroll');
  return (
    <SurfaceCard
      padding={0}
      interactive
      sx={{
        p: { xs: 1.8, sm: 2 },
        borderColor: (th) => alpha(th.palette.success.main, 0.32),
        bgcolor: (th) => alpha(th.palette.success.main, 0.06),
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.6}
        component="button"
        onClick={onClick}
        aria-label={t('addIncomeCta')}
        sx={{
          all: 'unset',
          display: 'flex',
          width: '100%',
          cursor: 'pointer',
          alignItems: 'center',
          gap: 1.6,
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 1.4,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'success.main',
            color: 'success.contrastText',
            flexShrink: 0,
          }}
        >
          <Icon icon="mdi:calendar-sync-outline" width={22} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.92rem' }}>{t('addIncomeCta')}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('addIncomeCtaHint')}
          </Typography>
        </Box>
        <Icon icon="mdi:chevron-right" width={22} style={{ color: 'var(--pr-ink-mute)', flexShrink: 0 }} />
      </Stack>
    </SurfaceCard>
  );
}

function NoteBox() {
  const { t } = useTranslation('payroll');
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
        p: 1.6,
        borderRadius: 2,
        border: '1px solid',
        borderColor: (th) => alpha(th.palette.warning.main, 0.3),
        bgcolor: (th) => alpha(th.palette.warning.main, 0.08),
      }}
    >
      <Icon icon="mdi:information-outline" width={16} style={{ flexShrink: 0, marginTop: 2 }} />
      <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>
        {t('note')}
      </Typography>
    </Box>
  );
}

/* ── 12 aylık kırılım tablosu (merkez parça) ──────────────────────────────── */

const NUM_SX = {
  fontFamily: '"Geist Mono", monospace',
  fontSize: '0.78rem',
  whiteSpace: 'nowrap',
} as const;

function MonthsTable({ data }: { data: PayrollResultDto }) {
  const { t } = useTranslation(['payroll', 'common']);
  // Gizlilik modu: maaş tablosu hücreleri •••• (kolonlar ₺ cinsinden, sembolsüz).
  const hideAmounts = usePrivacyStore((s) => s.hideAmounts);
  const num = (v: number) => (hideAmounts ? '••••' : formatNumber(v));

  // Net'in yön değiştirdiği aylar: dilim atlaması (düşüş) / istisna artışı (toparlama).
  const marks = useMemo(() => {
    const m = new Map<number, 'drop' | 'recover'>();
    for (let i = 1; i < data.months.length; i++) {
      const prev = data.months[i - 1].net;
      const cur = data.months[i].net;
      if (cur < prev - 0.005) m.set(data.months[i].month, 'drop');
      else if (cur > prev + 0.005) m.set(data.months[i].month, 'recover');
    }
    return m;
  }, [data]);

  const headCell = (label: string, tooltip?: string, first = false) => (
    <TableCell
      align={first ? 'left' : 'right'}
      sx={{
        fontFamily: '"Geist Mono", monospace',
        fontSize: '0.62rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'text.disabled',
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 1.1,
        whiteSpace: 'nowrap',
      }}
    >
      {tooltip ? (
        <Tooltip title={tooltip} arrow>
          <Box component="span" sx={{ cursor: 'help', borderBottom: '1px dotted', borderColor: 'text.disabled' }}>
            {label}
          </Box>
        </Tooltip>
      ) : (
        label
      )}
    </TableCell>
  );

  return (
    <SurfaceCard padding={0} edge sx={{ overflow: 'hidden' }}>
      <Box sx={{ px: { xs: 2.2, sm: 2.6 }, pt: 2.4, pb: 1.6 }}>
        <Typography
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: '0.66rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'text.disabled',
            mb: 0.4,
          }}
        >
          {data.year} · TRY
        </Typography>
        <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.15rem', lineHeight: 1.2 }}>
          {t('payroll:table_title')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('payroll:table_subtitle')}
        </Typography>
      </Box>

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" aria-label={t('payroll:table_title')} sx={{ minWidth: 620 }}>
          <TableHead>
            <TableRow>
              {headCell(t('payroll:col_month'), undefined, true)}
              {headCell(t('payroll:col_gross'))}
              {headCell(t('payroll:col_sgk'), t('payroll:bd_sgk'))}
              {headCell(t('payroll:col_unemployment'), t('payroll:bd_unemployment'))}
              {headCell(t('payroll:col_incomeTax'), t('payroll:bd_incomeTax'))}
              {headCell(t('payroll:col_stamp'), t('payroll:bd_stamp'))}
              {headCell(t('payroll:col_net'), t('payroll:bd_net'))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.months.map((m, i) => (
              <MonthRow key={m.month} month={m} index={i} mark={marks.get(m.month)} />
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '0.64rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  fontWeight: 600,
                  borderBottom: 'none',
                  borderTop: '2px solid',
                  borderColor: 'divider',
                  py: 1.4,
                }}
              >
                {t('payroll:table_total')}
              </TableCell>
              {[data.annualGross, data.annualSgk, data.annualUnemployment, data.annualIncomeTax, data.annualStamp].map(
                (v, idx) => (
                  <TableCell
                    key={idx}
                    align="right"
                    sx={{
                      ...NUM_SX,
                      color: 'text.secondary',
                      fontWeight: 600,
                      borderBottom: 'none',
                      borderTop: '2px solid',
                      borderColor: 'divider',
                      py: 1.4,
                    }}
                  >
                    {num(v)}
                  </TableCell>
                ),
              )}
              <TableCell
                align="right"
                sx={{
                  ...NUM_SX,
                  color: 'success.main',
                  fontWeight: 700,
                  borderBottom: 'none',
                  borderTop: '2px solid',
                  borderColor: 'divider',
                  py: 1.4,
                }}
              >
                {num(data.annualNet)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </SurfaceCard>
  );
}

function MonthRow({
  month: m,
  index,
  mark,
}: {
  month: PayrollMonthDto;
  index: number;
  mark?: 'drop' | 'recover';
}) {
  const { t } = useTranslation(['payroll', 'common']);
  // Gizlilik modu: ay satırındaki tüm maaş kalemleri maskelenir.
  const hideAmounts = usePrivacyStore((s) => s.hideAmounts);
  const num = (v: number) => (hideAmounts ? '••••' : formatNumber(v));

  const markEl =
    mark === 'drop' ? (
      <Tooltip title={t('payroll:mark_drop')} arrow>
        <Box
          component="span"
          aria-label={t('payroll:mark_drop')}
          sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main', display: 'inline-block', flexShrink: 0 }}
        />
      </Tooltip>
    ) : mark === 'recover' ? (
      <Tooltip title={t('payroll:mark_recover')} arrow>
        <Box
          component="span"
          aria-label={t('payroll:mark_recover')}
          sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main', display: 'inline-block', flexShrink: 0 }}
        />
      </Tooltip>
    ) : null;

  return (
    <TableRow
      sx={{
        '&:hover': { bgcolor: (th) => alpha(th.palette.success.main, 0.04) },
        '& td': { borderBottom: '1px dashed', borderColor: 'divider', py: 1.05 },
        '&:last-of-type td': { borderBottom: 'none' },
        ...(index % 2 === 1 && {
          bgcolor: (th) => (th.palette.mode === 'dark' ? 'rgba(255,255,255,0.015)' : 'rgba(43,30,14,0.015)'),
        }),
      }}
    >
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Stack direction="row" alignItems="center" spacing={0.8}>
          <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
            {t(`common:${MONTH_KEYS[m.month - 1]}`)}
          </Typography>
          {markEl}
        </Stack>
      </TableCell>
      <TableCell align="right" sx={{ ...NUM_SX, color: 'text.secondary' }}>
        {num(m.gross)}
      </TableCell>
      <TableCell align="right" sx={{ ...NUM_SX, color: 'text.secondary' }}>
        {num(m.sgk)}
      </TableCell>
      <TableCell align="right" sx={{ ...NUM_SX, color: 'text.secondary' }}>
        {num(m.unemployment)}
      </TableCell>
      <TableCell align="right" sx={{ ...NUM_SX, color: 'text.secondary' }}>
        {num(m.incomeTax)}
      </TableCell>
      <TableCell align="right" sx={{ ...NUM_SX, color: 'text.secondary' }}>
        {num(m.stampTax)}
      </TableCell>
      <TableCell align="right" sx={{ ...NUM_SX, color: 'success.main', fontWeight: 700, fontSize: '0.8rem' }}>
        {num(m.net)}
      </TableCell>
    </TableRow>
  );
}

/* ── İskelet ──────────────────────────────────────────────────────────────── */

function ResultSkeleton() {
  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, lg: 5 }}>
        <SurfaceCard padding={2.6}>
          <Skeleton variant="text" width="40%" height={20} />
          <Skeleton variant="text" width="70%" height={52} />
          <Skeleton variant="rounded" height={8} sx={{ my: 1.6, borderRadius: 99 }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="text" width="100%" height={28} />
          ))}
        </SurfaceCard>
      </Grid>
      <Grid size={{ xs: 12, lg: 7 }}>
        <SurfaceCard padding={2.6}>
          <Skeleton variant="text" width="35%" height={26} sx={{ mb: 1.5 }} />
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} variant="text" width="100%" height={26} />
          ))}
        </SurfaceCard>
      </Grid>
    </Grid>
  );
}
