import { useMemo, useState } from 'react';
import { Box, Button, Grid, Skeleton, Stack, Tab, Tabs } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import { SectionHeader } from '@shared/components/SectionHeader';
import { PageTourTrigger } from '@features/onboarding';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { EmptyState } from '@shared/components/EmptyState';
import { StatCard } from '@shared/components/StatCard';
import { DeleteModal } from '@shared/components/DeleteModal';
import type { GoalDto, GoalStatus } from '@shared/api/types';
import { useDeleteGoal, useGoalsQuery } from '../api/useGoals';
import { GoalCard } from '../components/GoalCard';
import { GoalFormModal } from '../components/GoalFormModal';
import { GoalContributeModal } from '../components/GoalContributeModal';

type FilterValue = 'all' | GoalStatus;

export function GoalsPage() {
  const { t } = useTranslation(['pages', 'common']);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GoalDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GoalDto | null>(null);
  const [contributeTarget, setContributeTarget] = useState<GoalDto | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useGoalsQuery();
  const deleteMutation = useDeleteGoal();

  const goals = useMemo(() => data ?? [], [data]);

  const counts = useMemo(() => {
    const c = { all: goals.length, active: 0, completed: 0, paused: 0 };
    for (const g of goals) c[g.status]++;
    return c;
  }, [goals]);

  const visible = useMemo(() => {
    if (filter === 'all') return goals;
    return goals.filter((g) => g.status === filter);
  }, [goals, filter]);

  const totals = useMemo(() => {
    const active = goals.filter((g) => g.status === 'active');
    const target = active.reduce((s, g) => s + g.target, 0);
    const current = active.reduce((s, g) => s + g.current, 0);
    const remaining = Math.max(0, target - current);
    const avgPct = active.length === 0 ? 0 : active.reduce((s, g) => s + (g.target > 0 ? (g.current / g.target) * 100 : 0), 0) / active.length;
    return { target, current, remaining, avgPct, completed: counts.completed };
  }, [goals, counts.completed]);

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };
  const openEdit = (g: GoalDto) => {
    setEditTarget(g);
    setFormOpen(true);
  };
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t('goals.toastDeleteSuccess'));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('goals.toastError')));
    }
  };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 1280, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('goals.eyebrow')}
        title={t('goals.title')}
        description={t('goals.description')}
        action={
          <Button
            variant="contained"
            startIcon={<Icon icon="mdi:flag-plus-outline" width={18} />}
            onClick={openCreate}
            data-tour="goals-new"
          >
            {t('goals.newButton')}
          </Button>
        }
      />

      <PageTourTrigger page="goals" />

      {/* Summary stat cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('goals.savedLabel')}
            value={totals.current}
            icon="mdi:piggy-bank-outline"
            tone="go"
            hint={t('goals.statusActive')}
            index={0}
            loading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('goals.targetAmountLabel')}
            value={totals.target}
            icon="mdi:target"
            tone="ink"
            hint={t('goals.statusActive')}
            index={1}
            loading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('goals.ringComplete')}
            value={totals.avgPct}
            unit="%"
            icon="mdi:chart-arc"
            tone={totals.avgPct >= 70 ? 'go' : totals.avgPct >= 40 ? 'way' : 'halt'}
            hint={t('goals.statusActive')}
            index={2}
            loading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('goals.badgeCompleted')}
            value={totals.completed}
            unit=" "
            icon="mdi:trophy-outline"
            tone="sky"
            hint={t('goals.title')}
            index={3}
            loading={isLoading}
          />
        </Grid>
      </Grid>

      <Tabs
        value={filter}
        onChange={(_, v: FilterValue) => setFilter(v)}
        sx={{ mb: 2.5, minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', letterSpacing: 0 } }}
      >
        <Tab value="all" label={`${t('goals.filterAll')} (${counts.all})`} />
        <Tab
          value="active"
          icon={<Icon icon="mdi:rocket-launch-outline" width={16} />}
          iconPosition="start"
          label={`${t('goals.filterActive')} (${counts.active})`}
        />
        <Tab
          value="completed"
          icon={<Icon icon="mdi:check-circle-outline" width={16} />}
          iconPosition="start"
          label={`${t('goals.filterCompleted')} (${counts.completed})`}
        />
        <Tab
          value="paused"
          icon={<Icon icon="mdi:pause-circle-outline" width={16} />}
          iconPosition="start"
          label={`${t('goals.filterPaused')} (${counts.paused})`}
        />
      </Tabs>

      {isLoading ? (
        <GoalsSkeleton />
      ) : isError ? (
        <EmptyState
          icon="mdi:alert-circle-outline"
          title={t('goals.errorTitle')}
          action={
            <Button variant="contained" onClick={() => void refetch()} startIcon={<Icon icon="mdi:refresh" width={18} />}>
              {t('goals.errorRetry')}
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="mdi:target"
          title={t('goals.emptyTitle')}
          description={t('goals.emptyDescription')}
          action={
            <Button variant="contained" startIcon={<Icon icon="mdi:plus" width={18} />} onClick={openCreate}>
              {t('goals.emptyAction')}
            </Button>
          }
        />
      ) : (
        <Grid container spacing={2.5} sx={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity .2s' }}>
          {visible.map((g, i) => (
            <Grid key={g.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <GoalCard
                goal={g}
                index={i}
                onEdit={() => openEdit(g)}
                onDelete={() => setDeleteTarget(g)}
                onContribute={() => setContributeTarget(g)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <GoalFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={editTarget ? 'edit' : 'create'}
        goal={editTarget ?? undefined}
      />

      <GoalContributeModal
        open={contributeTarget !== null}
        onClose={() => setContributeTarget(null)}
        goal={contributeTarget}
      />

      <DeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t('goals.deleteTitle')}
        description={t('goals.deleteDescription')}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}

function GoalsSkeleton() {
  return (
    <Grid container spacing={2.5}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
          <SurfaceCard padding={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="rounded" width={70} height={22} />
            </Stack>
            <Skeleton variant="text" width="70%" height={28} />
            <Skeleton variant="text" width="50%" height={16} />
            <Stack direction="row" spacing={2.5} alignItems="center" sx={{ mt: 2.5 }}>
              <Skeleton variant="circular" width={144} height={144} />
              <Stack spacing={1.4} sx={{ flex: 1 }}>
                <Box>
                  <Skeleton variant="text" width="40%" height={14} />
                  <Skeleton variant="text" width="65%" height={22} />
                </Box>
                <Box>
                  <Skeleton variant="text" width="40%" height={14} />
                  <Skeleton variant="text" width="65%" height={22} />
                </Box>
              </Stack>
            </Stack>
            <Skeleton variant="text" width="100%" height={18} sx={{ mt: 2.5 }} />
          </SurfaceCard>
        </Grid>
      ))}
    </Grid>
  );
}
