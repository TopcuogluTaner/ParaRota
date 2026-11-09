import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { notifyError } from '@shared/lib/apiError';
import { SectionHeader } from '@shared/components/SectionHeader';
import { PageTourTrigger } from '@features/onboarding';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { EmptyState } from '@shared/components/EmptyState';
import { Money } from '@shared/components/Money';
import { StatCard } from '@shared/components/StatCard';
import { DeleteModal } from '@shared/components/DeleteModal';
import type { BudgetDto } from '@shared/api/types';
import { useBudgetsQuery, useDeleteBudget } from '../api/useBudgets';
import { BudgetFormModal } from '../components/BudgetFormModal';

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

export function BudgetsPage() {
  const { t } = useTranslation(['pages', 'common']);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetDto | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useBudgetsQuery(month, year);
  const deleteMutation = useDeleteBudget();

  const budgets = useMemo(() => data ?? [], [data]);

  const totals = useMemo(() => {
    const limit = budgets.reduce((s, b) => s + b.monthlyLimit, 0);
    const spent = budgets.reduce((s, b) => s + b.spent, 0);
    const remaining = limit - spent;
    const usage = limit > 0 ? (spent / limit) * 100 : 0;
    return { limit, spent, remaining, usage };
  }, [budgets]);

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (budget: BudgetDto) => {
    setEditTarget(budget);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t('budgets.toastDeleteSuccess'));
      setDeleteTarget(null);
    } catch (err) {
      notifyError(err);
    }
  };

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 1280, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('budgets.eyebrow')}
        title={t('budgets.title')}
        description={t('budgets.description')}
        action={
          <Button
            variant="contained"
            startIcon={<Icon icon="mdi:plus" width={18} />}
            onClick={openCreate}
            data-tour="budgets-new"
          >
            {t('budgets.newButton')}
          </Button>
        }
      />

      <PageTourTrigger page="budgets" />

      {/* Month/Year selector */}
      <Stack direction="row" spacing={1.2} sx={{ mb: 3 }}>
        <Select
          size="small"
          value={month}
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

      {/* Totals */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label={t('budgets.statTotal')} value={totals.limit} icon="mdi:wallet-outline" tone="sky" index={0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label={t('budgets.statSpent')} value={totals.spent} icon="mdi:cash-minus" tone="halt" index={1} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label={t('budgets.statRemaining')} value={totals.remaining} icon="mdi:cash-plus" tone="go" index={2} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label={t('budgets.statUsage')}
            value={Math.round(totals.usage)}
            unit="%"
            icon="mdi:gauge"
            tone={totals.usage >= 90 ? 'halt' : totals.usage >= 70 ? 'way' : 'go'}
            index={3}
          />
        </Grid>
      </Grid>

      {isLoading ? (
        <BudgetsSkeleton />
      ) : isError ? (
        <EmptyState
          icon="mdi:alert-circle-outline"
          title={t('budgets.errorTitle')}
          action={
            <Button variant="contained" onClick={() => void refetch()} startIcon={<Icon icon="mdi:refresh" width={18} />}>
              {t('budgets.errorRetry')}
            </Button>
          }
        />
      ) : budgets.length === 0 ? (
        <EmptyState
          icon="mdi:wallet-outline"
          title={t('budgets.emptyTitle')}
          description={t('budgets.emptyDescription')}
          action={
            <Button variant="contained" startIcon={<Icon icon="mdi:plus" width={18} />} onClick={openCreate}>
              {t('budgets.emptyAction')}
            </Button>
          }
        />
      ) : (
        <Grid container spacing={2.5} sx={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity .2s' }}>
          {budgets.map((b, i) => (
            <Grid key={b.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <BudgetCard
                budget={b}
                index={i}
                onEdit={() => openEdit(b)}
                onDelete={() => setDeleteTarget(b)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <BudgetFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={editTarget ? 'edit' : 'create'}
        budget={editTarget ?? undefined}
        defaultMonth={month}
        defaultYear={year}
      />
      <DeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('budgets.deleteTitle')}
        description={t('budgets.deleteDescription')}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}

interface CardProps {
  budget: BudgetDto;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

function BudgetCard({ budget, index, onEdit, onDelete }: CardProps) {
  const { t } = useTranslation(['pages', 'common']);
  const color = budget.category.color ?? '#5A6E7C';
  const pct = Math.min(100, Math.round(budget.usagePercentage));
  const isExceeded = budget.alertLevel === 'exceeded';
  const isWarning = budget.alertLevel === 'warning';
  const tone: 'error' | 'warning' | 'success' = isExceeded ? 'error' : isWarning ? 'warning' : 'success';
  const statusText = isExceeded
    ? t('budgets.alert_exceeded')
    : isWarning
      ? t('budgets.alert_warning')
      : t('budgets.alert_normal');
  const overAmount = isExceeded ? budget.spent - budget.monthlyLimit : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
    >
      <SurfaceCard padding={3} glow={isExceeded ? 'halt' : isWarning ? 'way' : 'none'}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.4,
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha(color, 0.16),
                color,
                fontSize: '1.3rem',
                flexShrink: 0,
              }}
            >
              {budget.category.emoji ? budget.category.emoji : <Icon icon={budget.category.icon} width={20} />}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.15rem', lineHeight: 1.1 }}
                noWrap
              >
                {budget.category.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  textTransform: 'none',
                  letterSpacing: 0,
                  color: `${tone}.main`,
                  fontWeight: 500,
                }}
              >
                {statusText}
              </Typography>
            </Box>
          </Stack>
          <Typography
            className="pr-num"
            sx={{
              fontSize: '1.6rem',
              fontWeight: 600,
              color: `${tone}.main`,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            %{pct}
          </Typography>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={pct}
          color={tone}
          sx={{
            height: 10,
            borderRadius: 999,
            bgcolor: (th) => alpha(th.palette.text.disabled, 0.16),
          }}
        />

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'none', letterSpacing: 0, color: 'text.disabled' }}>
              {t('budgets.spentLabel')}
            </Typography>
            <Box>
              <Money value={budget.spent} size="md" weight={600} tone={isExceeded ? 'halt' : 'neutral'} />
              <Typography
                component="span"
                sx={{
                  ml: 0.6,
                  color: 'text.disabled',
                  fontSize: '0.78rem',
                  fontFamily: '"Geist Mono", monospace',
                }}
              >
                /
              </Typography>
              <Box component="span" sx={{ ml: 0.4 }}>
                <Money value={budget.monthlyLimit} size="sm" weight={500} tone="mute" />
              </Box>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ textTransform: 'none', letterSpacing: 0, color: 'text.disabled' }}>
              {isExceeded ? t('budgets.overLabel') : t('budgets.remainingLabel')}
            </Typography>
            <Box>
              <Money
                value={isExceeded ? overAmount : budget.remaining}
                size="md"
                weight={600}
                tone={isExceeded ? 'halt' : 'go'}
              />
            </Box>
          </Box>
        </Stack>

        {(budget.memberBreakdown?.length ?? 0) > 0 && (
          <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.6rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                display: 'block',
                mb: 0.8,
              }}
            >
              {t('budgets.memberBreakdownLabel')}
            </Typography>
            <Stack spacing={0.6}>
              {budget.memberBreakdown.map((m) => (
                <Stack key={m.userId} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Stack direction="row" spacing={0.6} alignItems="center" sx={{ minWidth: 0 }}>
                    <Icon icon="mdi:account-outline" width={13} style={{ color: 'var(--pr-ink-mute)', flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ textTransform: 'none', letterSpacing: 0 }} noWrap>
                      {m.name || t('common:unknown')}
                    </Typography>
                  </Stack>
                  <Money value={m.amount} size="sm" weight={500} tone="neutral" />
                </Stack>
              ))}
            </Stack>
          </Box>
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={0.2} sx={{ mt: 1.5 }}>
          <Tooltip title={t('common:edit')} arrow>
            <IconButton size="small" onClick={onEdit} aria-label={t('common:edit')} sx={{ width: 28, height: 28 }}>
              <Icon icon="mdi:pencil-outline" width={15} />
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
      </SurfaceCard>
    </motion.div>
  );
}

function BudgetsSkeleton() {
  return (
    <Grid container spacing={2.5}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
          <SurfaceCard padding={3}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Skeleton variant="rounded" width={44} height={44} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="40%" height={16} />
              </Box>
              <Skeleton variant="text" width={48} height={32} />
            </Stack>
            <Skeleton variant="rounded" width="100%" height={10} />
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
              <Skeleton variant="text" width={80} height={28} />
              <Skeleton variant="text" width={80} height={28} />
            </Stack>
          </SurfaceCard>
        </Grid>
      ))}
    </Grid>
  );
}
