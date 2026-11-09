import { useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Skeleton, Stack, Tab, Tabs } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { SectionHeader } from '@shared/components/SectionHeader';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { EmptyState } from '@shared/components/EmptyState';
import { DeleteModal } from '@shared/components/DeleteModal';
import type { NotificationDto } from '@shared/api/types';
import {
  useDeleteNotification,
  useMarkAllRead,
  useMarkRead,
  useNotificationsQuery,
} from '../api/useNotifications';
import { NotificationItem } from '../components/NotificationItem';

type FilterValue = 'all' | 'unread' | 'read';

export function NotificationsPage() {
  const { t } = useTranslation(['notifications', 'common']);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [deleteTarget, setDeleteTarget] = useState<NotificationDto | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useNotificationsQuery(50);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteMutation = useDeleteNotification();

  const all = useMemo(() => data ?? [], [data]);
  const counts = useMemo(() => {
    const unread = all.filter((n) => !n.isRead).length;
    return { all: all.length, unread, read: all.length - unread };
  }, [all]);

  const visible = useMemo(() => {
    if (filter === 'unread') return all.filter((n) => !n.isRead);
    if (filter === 'read') return all.filter((n) => n.isRead);
    return all;
  }, [all, filter]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      toast.error(t('common:errorGeneric'));
    }
  };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 880, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('page_eyebrow')}
        title={t('page_title')}
        description={t('page_description')}
        action={
          counts.unread > 0 ? (
            <Button
              variant="text"
              startIcon={
                markAllRead.isPending ? (
                  <CircularProgress size={16} thickness={5} />
                ) : (
                  <Icon icon="mdi:check-all" width={18} />
                )
              }
              onClick={() =>
                markAllRead.mutate(undefined, {
                  onSuccess: () => toast.success(t('toastAllRead')),
                  onError: () => toast.error(t('common:errorGeneric')),
                })
              }
              disabled={markAllRead.isPending}
            >
              {t('markAllRead')}
            </Button>
          ) : null
        }
      />

      <Tabs
        value={filter}
        onChange={(_, v: FilterValue) => setFilter(v)}
        sx={{
          mb: 2.5,
          minHeight: 40,
          '& .MuiTab-root': { minHeight: 40, textTransform: 'none', letterSpacing: 0 },
        }}
      >
        <Tab value="all" label={`${t('filter_all')} (${counts.all})`} />
        <Tab
          value="unread"
          icon={<Icon icon="mdi:circle-medium" width={16} />}
          iconPosition="start"
          label={`${t('filter_unread')} (${counts.unread})`}
        />
        <Tab
          value="read"
          icon={<Icon icon="mdi:check" width={16} />}
          iconPosition="start"
          label={`${t('filter_read')} (${counts.read})`}
        />
      </Tabs>

      {isLoading ? (
        <NotificationsSkeleton />
      ) : isError ? (
        <EmptyState
          icon="mdi:alert-circle-outline"
          title={t('errorTitle')}
          action={
            <Button
              variant="contained"
              onClick={() => void refetch()}
              startIcon={<Icon icon="mdi:refresh" width={18} />}
            >
              {t('errorRetry')}
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="mdi:bell-outline"
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      ) : (
        <SurfaceCard
          padding={0}
          sx={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity .2s', overflow: 'hidden' }}
        >
          <Stack divider={<Box sx={{ height: 1, bgcolor: 'divider' }} />}>
            {visible.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkRead={(id) => markRead.mutate(id)}
                onDelete={() => setDeleteTarget(n)}
              />
            ))}
          </Stack>
        </SurfaceCard>
      )}

      <DeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t('deleteConfirmTitle')}
        description={t('deleteConfirmBody')}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}

function NotificationsSkeleton() {
  return (
    <SurfaceCard padding={0} sx={{ overflow: 'hidden' }}>
      <Stack divider={<Box sx={{ height: 1, bgcolor: 'divider' }} />}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Stack key={i} direction="row" spacing={1.4} sx={{ px: 2.4, py: 1.8 }}>
            <Skeleton variant="rounded" width={38} height={38} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="50%" height={20} />
              <Skeleton variant="text" width="75%" height={16} sx={{ mt: 0.3 }} />
            </Box>
            <Skeleton variant="text" width={48} height={14} />
          </Stack>
        ))}
      </Stack>
    </SurfaceCard>
  );
}

