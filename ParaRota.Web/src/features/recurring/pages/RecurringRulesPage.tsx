import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { SectionHeader } from '@shared/components/SectionHeader';
import { PageTourTrigger } from '@features/onboarding';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { EmptyState } from '@shared/components/EmptyState';
import { Money } from '@shared/components/Money';
import { SignalBadge } from '@shared/components/SignalBadge';
import { DeleteModal } from '@shared/components/DeleteModal';
import { dayjs } from '@shared/lib/dateFormat';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import type { RecurringFrequency, RecurringRuleDto } from '@shared/api/types';
import {
  useDeleteRecurringRule,
  useRunRecurringRuleNow,
  useRecurringRulesQuery,
} from '../api/useRecurringRules';
import { RecurringRuleFormModal } from '../components/RecurringRuleFormModal';
import { PopularSubscriptions } from '../components/PopularSubscriptions';
import { SubscriptionRadar } from '../components/SubscriptionRadar';
import { PayrollManageModal } from '@features/payroll/components/PayrollManageModal';
import type { RecurringRuleFormState } from '../components/useRecurringRuleFormState';

// Maaş otomatiği kuralları (payrollGrossMonthly dolu) jenerik form yerine maaş yönetimine gider.
const isPayrollRule = (r: RecurringRuleDto) => r.payrollGrossMonthly != null;

export function RecurringRulesPage() {
  const { t } = useTranslation(['pages', 'common']);
  const [tab, setTab] = useState<'active' | 'paused'>('active');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RecurringRuleDto | null>(null);
  const [preset, setPreset] = useState<Partial<RecurringRuleFormState> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringRuleDto | null>(null);
  const [managePayroll, setManagePayroll] = useState<RecurringRuleDto | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useRecurringRulesQuery();
  const deleteMutation = useDeleteRecurringRule();
  const runNowMutation = useRunRecurringRuleNow();

  // Taksit planları (installmentCount dolu) burada GÖRÜNMEZ — evleri Taksitler sayfası.
  // (Payroll'dan farkı: payroll'un kendi listesi yok, o yüzden burada rozetle yaşıyor;
  // taksit iki listede çift sayım + jenerik formun taksit kilitlerine çarpması olurdu.)
  const rules = useMemo(() => (data ?? []).filter((r) => r.installmentCount == null), [data]);

  const counts = useMemo(
    () => ({
      active: rules.filter((r) => r.isActive).length,
      paused: rules.filter((r) => !r.isActive).length,
    }),
    [rules],
  );

  const visible = useMemo(
    () => rules.filter((r) => (tab === 'active' ? r.isActive : !r.isActive)),
    [rules, tab],
  );

  const openCreate = () => {
    setEditTarget(null);
    setPreset(null);
    setFormOpen(true);
  };

  const openEdit = (rule: RecurringRuleDto) => {
    if (isPayrollRule(rule)) {
      setManagePayroll(rule);
      return;
    }
    setEditTarget(rule);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t('recurring.toastDeleteSuccess'));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('recurring.toastError')));
    }
  };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 1280, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('recurring.eyebrow')}
        title={t('recurring.title')}
        description={t('recurring.description')}
        action={
          <Button
            variant="contained"
            startIcon={<Icon icon="mdi:plus" width={18} />}
            onClick={openCreate}
            data-tour="recurring-new"
          >
            {t('recurring.newButton')}
          </Button>
        }
      />

      <PageTourTrigger page="recurring" />

      <Tabs
        value={tab}
        onChange={(_, v: 'active' | 'paused') => setTab(v)}
        sx={{
          mb: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTabs-flexContainer': { gap: 1 },
        }}
      >
        <Tab
          value="active"
          icon={<Icon icon="mdi:repeat" width={16} />}
          iconPosition="start"
          label={`${t('recurring.tabActive')} (${counts.active})`}
        />
        <Tab
          value="paused"
          icon={<Icon icon="mdi:pause-circle-outline" width={16} />}
          iconPosition="start"
          label={`${t('recurring.tabPaused')} (${counts.paused})`}
        />
      </Tabs>

      <SubscriptionRadar />

      <Box data-tour="recurring-popular">
        <PopularSubscriptions
          onSelect={(item, categoryId) => {
            setEditTarget(null);
            setPreset({
              description: item.name,
              type: 'expense',
              categoryId,
              amount: String(item.suggestedAmount),
              currency: item.currency,
              frequency: item.frequency,
            });
            setFormOpen(true);
          }}
        />
      </Box>

      {isLoading ? (
        <RulesSkeleton />
      ) : isError ? (
        <EmptyState
          icon="mdi:alert-circle-outline"
          title={t('recurring.errorTitle')}
          action={
            <Button variant="contained" onClick={() => void refetch()} startIcon={<Icon icon="mdi:refresh" width={18} />}>
              {t('recurring.errorRetry')}
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="mdi:repeat"
          title={t('recurring.emptyTitle')}
          description={t('recurring.emptyDescription')}
          action={
            <Button variant="contained" startIcon={<Icon icon="mdi:plus" width={18} />} onClick={openCreate}>
              {t('recurring.emptyAction')}
            </Button>
          }
        />
      ) : (
        <Grid container spacing={2.5} sx={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity .2s' }}>
          {visible.map((rule, i) => (
            <Grid key={rule.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <RuleCard
                rule={rule}
                index={i}
                onEdit={() => openEdit(rule)}
                onDelete={() => setDeleteTarget(rule)}
                onRunNow={() => {
                  runNowMutation.mutate(rule.id, {
                    onSuccess: () => toast.success(t('recurring.runNowSuccess')),
                    onError: (err) => {
                      toast.error(resolveApiErrorWithFallback(err, t('common:errorGeneric')));
                    },
                  });
                }}
                isRunning={runNowMutation.isPending && runNowMutation.variables === rule.id}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <RecurringRuleFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setPreset(null); }}
        mode={editTarget ? 'edit' : 'create'}
        rule={editTarget ?? undefined}
        preset={preset}
      />
      <DeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('recurring.deleteTitle')}
        description={t('recurring.deleteDescription')}
        loading={deleteMutation.isPending}
      />
      <PayrollManageModal
        open={managePayroll !== null}
        rule={managePayroll}
        onClose={() => setManagePayroll(null)}
      />
    </Box>
  );
}

interface CardProps {
  rule: RecurringRuleDto;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onRunNow: () => void;
  isRunning: boolean;
}

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  daily: 'recurring.freqDaily',
  weekly: 'recurring.freqWeekly',
  monthly: 'recurring.freqMonthly',
  yearly: 'recurring.freqYearly',
};

const FREQ_STEP: Record<RecurringFrequency, { amount: number; unit: 'day' | 'week' | 'month' | 'year' }> = {
  daily: { amount: 1, unit: 'day' },
  weekly: { amount: 1, unit: 'week' },
  monthly: { amount: 1, unit: 'month' },
  yearly: { amount: 1, unit: 'year' },
};

/** nextRunDate'ten başlayarak frequency adımıyla ileri giderek gelecek N çalışma tarihini hesaplar. endDate'i geçince durur. */
function computeNextRuns(rule: RecurringRuleDto, count = 5): string[] {
  if (!rule.isActive) return [];
  const step = FREQ_STEP[rule.frequency];
  const end = rule.endDate ? dayjs(rule.endDate) : null;
  const runs: string[] = [];
  let cursor = dayjs(rule.nextRunDate);
  // nextRunDate geçmişte kalmışsa (Hangfire henüz işlemediyse) bugüne kadar ilerlet —
  // geçmiş günleri "sonraki çalışmalar" olarak gösterme. Takvim ızgarası korunur.
  const today = dayjs();
  let guard = 0;
  while (cursor.isBefore(today, 'day') && guard++ < 1000) {
    cursor = cursor.add(step.amount, step.unit);
  }
  for (let i = 0; i < count; i++) {
    if (end && cursor.isAfter(end, 'day')) break;
    runs.push(cursor.format('D MMM'));
    cursor = cursor.add(step.amount, step.unit);
  }
  return runs;
}

function RuleCard({ rule, index, onEdit, onDelete, onRunNow, isRunning }: CardProps) {
  const { t } = useTranslation(['pages', 'common', 'payroll']);
  const payroll = isPayrollRule(rule);
  const color = rule.category.color ?? '#5A6E7C';
  const signedAmount = rule.type === 'expense' ? -rule.amount : rule.amount;
  const nextRun = dayjs(rule.nextRunDate);
  const isDue = rule.isActive && nextRun.isBefore(dayjs().add(1, 'day'), 'day');
  const nextRuns = useMemo(() => computeNextRuns(rule), [rule]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
    >
      <SurfaceCard padding={2.6}>
        <Stack direction="row" alignItems="flex-start" spacing={1.4} sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.4,
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(color, 0.16),
              color,
              flexShrink: 0,
              fontSize: '1.3rem',
            }}
          >
            {rule.category.emoji ? rule.category.emoji : <Icon icon={rule.category.icon} width={20} />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.05rem', lineHeight: 1.2 }}
              noWrap
            >
              {rule.description}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}
            >
              {rule.category.name} · {t(FREQ_LABELS[rule.frequency])}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Money value={signedAmount} currency={rule.currency} signed size="md" weight={600} />
          <Stack direction="row" spacing={0.6}>
            {payroll && (
              <SignalBadge
                tone="go"
                size="xs"
                variant="soft"
                icon={<Icon icon="mdi:calendar-sync-outline" width={11} />}
              >
                {t('payroll:automationBadge')}
              </SignalBadge>
            )}
            <SignalBadge tone={rule.autoApprove ? 'go' : 'way'} size="xs" variant="soft">
              {rule.autoApprove ? t('common:completed') : t('common:planned')}
            </SignalBadge>
            {!rule.isActive && (
              <SignalBadge tone="neutral" size="xs" variant="soft">
                {t('recurring.tabPaused')}
              </SignalBadge>
            )}
          </Stack>
        </Stack>

        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" alignItems="center" spacing={0.8}>
              <Icon icon="mdi:calendar-clock-outline" width={15} style={{ color: 'var(--pr-ink-mute)' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
                {t('recurring.nextRunLabel')}:{' '}
                <Box
                  component="span"
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontWeight: 500,
                    color: rule.isActive ? 'text.primary' : 'text.disabled',
                  }}
                >
                  {nextRun.format('D MMM YYYY')}
                </Box>
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.2}>
              {isDue && (
                <Tooltip title={t('recurring.runNow')} arrow>
                  <IconButton
                    size="small"
                    onClick={onRunNow}
                    disabled={isRunning}
                    aria-label={t('recurring.runNow')}
                    sx={{
                      width: 28,
                      height: 28,
                      color: 'success.main',
                      '&:hover': { bgcolor: (th) => alpha(th.palette.success.main, 0.12) },
                    }}
                  >
                    <Icon icon="mdi:play-circle-outline" width={15} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={payroll ? t('payroll:manageCta') : t('common:edit')} arrow>
                <IconButton
                  size="small"
                  onClick={onEdit}
                  aria-label={payroll ? t('payroll:manageCta') : t('common:edit')}
                  sx={{ width: 28, height: 28 }}
                >
                  <Icon icon={payroll ? 'mdi:cog-outline' : 'mdi:pencil-outline'} width={15} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common:delete')} arrow>
                <IconButton
                  size="small"
                  onClick={onDelete}
                  aria-label={t('common:delete')}
                  sx={{ width: 28, height: 28, '&:hover': { color: 'error.main' } }}
                >
                  <Icon icon="mdi:trash-can-outline" width={15} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        {rule.isActive && (
          <Box sx={{ mt: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 0.8 }}>
              <Icon icon="mdi:timeline-clock-outline" width={14} style={{ color: 'var(--pr-ink-mute)' }} />
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontSize: '0.62rem',
                  fontWeight: 600,
                }}
              >
                {t('recurring.nextRuns_title')}
              </Typography>
            </Stack>
            {nextRuns.length === 0 ? (
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', textTransform: 'none', letterSpacing: 0 }}
              >
                {t('recurring.nextRuns_none')}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                {nextRuns.map((d, di) => (
                  <SignalBadge key={di} tone={di === 0 ? 'sky' : 'neutral'} size="xs" variant="soft">
                    {d}
                  </SignalBadge>
                ))}
              </Box>
            )}
          </Box>
        )}
      </SurfaceCard>
    </motion.div>
  );
}

function RulesSkeleton() {
  return (
    <Grid container spacing={2.5}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
          <SurfaceCard padding={2.6}>
            <Stack direction="row" spacing={1.4} sx={{ mb: 1.5 }}>
              <Skeleton variant="rounded" width={44} height={44} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="70%" height={22} />
                <Skeleton variant="text" width="45%" height={16} />
              </Box>
            </Stack>
            <Skeleton variant="text" width="40%" height={24} />
            <Box sx={{ pt: 1.5, mt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
              <Skeleton variant="text" width="65%" height={16} />
            </Box>
          </SurfaceCard>
        </Grid>
      ))}
    </Grid>
  );
}
