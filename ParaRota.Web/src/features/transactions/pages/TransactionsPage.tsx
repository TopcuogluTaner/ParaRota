import { useMemo, useState } from 'react';
import { Box, Button, Chip, Skeleton, Stack } from '@mui/material';
import { Icon } from '@iconify/react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import { SectionHeader } from '@shared/components/SectionHeader';
import { EmptyState } from '@shared/components/EmptyState';
import { DeleteModal } from '@shared/components/DeleteModal';
import { Money } from '@shared/components/Money';
import { dayjs } from '@shared/lib/dateFormat';
import type { TransactionDto, TransactionListParams, TxNature, TxStatus, TxType } from '@shared/api/types';
import { PageTourTrigger } from '@features/onboarding';
import { TransactionFilters } from '../components/TransactionFilters';
import { TransactionRow } from '../components/TransactionRow';
import { QuickEntryModal } from '../components/QuickEntryModal';
import { MoveScopeModal } from '../components/MoveScopeModal';
import { useDeleteTransaction, useTransactionsQuery } from '../api/useTransactions';

export interface TxFilterState {
  type: 'all' | TxType;
  nature: 'all' | TxNature;
  status: 'all' | TxStatus;
  categoryId: 'all' | number;
  month: number;
  year: number;
}

export function TransactionsPage() {
  const { t } = useTranslation('pages');
  const now = new Date();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  const [filters, setFilters] = useState<TxFilterState>({
    type: 'all',
    nature: 'all',
    status: 'all',
    categoryId: 'all',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [quickOpen, setQuickOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TransactionDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransactionDto | null>(null);
  const [moveTarget, setMoveTarget] = useState<TransactionDto | null>(null);

  // Backend filter parametreleri.
  const queryParams = useMemo<TransactionListParams>(() => {
    const p: TransactionListParams = {
      month: filters.month,
      year: filters.year,
      page: 1,
      pageSize: 200,
    };
    if (filters.type !== 'all') p.type = filters.type;
    if (filters.nature !== 'all') p.nature = filters.nature;
    if (filters.status !== 'all') p.status = filters.status;
    if (filters.categoryId !== 'all') p.categoryId = filters.categoryId;
    if (query) p.q = query;
    return p;
  }, [filters, query]);

  const { data, isLoading, isError, refetch, isFetching } = useTransactionsQuery(queryParams);
  const deleteMutation = useDeleteTransaction();

  const items = useMemo(() => data?.items ?? [], [data]);
  const totalCount = data?.totalCount ?? 0;

  const clearQuery = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const grouped = useMemo(() => {
    const map = new Map<string, TransactionDto[]>();
    items.forEach((tx) => {
      const key = dayjs(tx.transactionDate).format('YYYY-MM-DD');
      const arr = map.get(key) ?? [];
      arr.push(tx);
      map.set(key, arr);
    });
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [items]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t('transactions.toastDeleteSuccess'));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('transactions.toastError')));
    }
  };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 1280, mx: 'auto', position: 'relative' }}>
      <SectionHeader
        eyebrow={t('transactions.eyebrow')}
        title={t('transactions.title')}
        description={t('transactions.description')}
        action={
          <Button
            variant="contained"
            startIcon={<Icon icon="mdi:plus" width={18} />}
            onClick={() => setQuickOpen(true)}
            data-tour="tx-new"
          >
            {t('transactions.newButton')}
          </Button>
        }
      />

      <Box sx={{ mb: 3 }} data-tour="tx-filters">
        <TransactionFilters value={filters} onChange={setFilters} totalCount={totalCount} />
      </Box>

      {query && (
        <Box sx={{ mb: 2 }}>
          <Chip
            icon={<Icon icon="mdi:magnify" width={14} />}
            label={
              <Stack direction="row" spacing={0.6} alignItems="center" component="span">
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  {t('transactions.searchChipLabel')}
                </Box>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {query}
                </Box>
              </Stack>
            }
            onDelete={clearQuery}
            deleteIcon={<Icon icon="mdi:close" width={14} />}
            sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.74rem' }}
          />
        </Box>
      )}

      {isLoading ? (
        <TransactionsListSkeleton />
      ) : isError ? (
        <EmptyState
          icon="mdi:alert-circle-outline"
          title={t('transactions.errorTitle')}
          action={
            <Button
              variant="contained"
              startIcon={<Icon icon="mdi:refresh" width={18} />}
              onClick={() => void refetch()}
            >
              {t('transactions.errorRetry')}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="mdi:map-search-outline"
          title={t('transactions.emptyTitle')}
          description={t('transactions.emptyDescription')}
          action={
            <Button variant="contained" startIcon={<Icon icon="mdi:plus" width={18} />} onClick={() => setQuickOpen(true)}>
              {t('transactions.emptyAction')}
            </Button>
          }
        />
      ) : (
        <Stack spacing={3} sx={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity .2s' }} data-tour="tx-list">
          {grouped.map(([day, dayItems], gi) => {
            const dayTotal = dayItems.reduce(
              (s, tx) => s + (tx.type === 'expense' ? -tx.amount : tx.amount),
              0,
            );
            // Gün toplamını sabit ₺ yerine günün para birimiyle, app formatlayıcısıyla göster.
            // (Karışık para birimi nadirdir; tek para birimi varsayımıyla ilk kaydınkini kullanır.)
            const dayCurrency = dayItems[0]?.currency ?? 'TRY';
            return (
              <Box key={day}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.4, px: 1 }}>
                  <Box
                    sx={{
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: '0.66rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: 'text.disabled',
                    }}
                  >
                    {dayjs(day).format('D MMMM dddd')}
                  </Box>
                  <Box className="pr-route-line" sx={{ flex: 1, opacity: 0.6 }} />
                  <Money
                    value={dayTotal}
                    currency={dayCurrency}
                    signed
                    size="sm"
                    weight={600}
                    sx={{ fontSize: '0.74rem' }}
                  />
                </Stack>
                <Stack spacing={1}>
                  {dayItems.map((tx, i) => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      index={gi * 5 + i}
                      onEdit={(tx) => setEditTarget(tx)}
                      onDelete={(tx) => setDeleteTarget(tx)}
                      onMove={(tx) => setMoveTarget(tx)}
                    />
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* Sayfa-içi "Hızlı Kayıt" CTA'sı (header & empty state) — modal'ı bu sayfa
          da açıyor, ama global FAB QuickActionDock MainLayout'ta. */}
      <QuickEntryModal open={quickOpen} onClose={() => setQuickOpen(false)} />

      {/* Düzenleme: aynı modal edit modunda — ayrı instance, hedefe göre key'lenir
          ki açılışta form doğru kayıttan dolsun. */}
      {editTarget && (
        <QuickEntryModal
          key={editTarget.id}
          open={editTarget !== null}
          onClose={() => setEditTarget(null)}
          editing={editTarget}
        />
      )}

      {moveTarget && (
        <MoveScopeModal
          open={moveTarget !== null}
          onClose={() => setMoveTarget(null)}
          tx={moveTarget}
        />
      )}

      <DeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t('transactions.deleteTitle')}
        description={t('transactions.deleteDescription')}
        loading={deleteMutation.isPending}
      />

      <PageTourTrigger page="transactions" />
    </Box>
  );
}

function TransactionsListSkeleton() {
  // Gün başlığı + 4 satır pattern; iki gün için tekrar
  return (
    <Stack spacing={3}>
      {Array.from({ length: 2 }).map((_, gi) => (
        <Box key={gi}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.4, px: 1 }}>
            <Skeleton variant="text" width={120} height={14} />
            <Box className="pr-route-line" sx={{ flex: 1, opacity: 0.6 }} />
            <Skeleton variant="text" width={80} height={18} />
          </Stack>
          <Stack
            divider={<Box sx={{ height: 1, bgcolor: 'divider' }} />}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}
          >
            {Array.from({ length: 4 }).map((__, ri) => (
              <Stack key={ri} direction="row" alignItems="center" spacing={1.6} sx={{ p: 1.4 }}>
                <Skeleton variant="rounded" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="55%" height={18} />
                  <Skeleton variant="text" width="35%" height={14} />
                </Box>
                <Skeleton variant="text" width={84} height={22} />
              </Stack>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
