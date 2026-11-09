import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
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
import { SectionHeader } from '@shared/components/SectionHeader';
import { PageTourTrigger } from '@features/onboarding';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { EmptyState } from '@shared/components/EmptyState';
import { ZoomModal } from '@shared/components/ZoomModal';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Money } from '@shared/components/Money';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import { dayjs } from '@shared/lib/dateFormat';
import { useDebtsQuery, useDeleteDebt, useDebtQuery } from '../api/useDebts';
import { DebtFormModal } from '../components/DebtFormModal';
import { DebtPaymentModal } from '../components/DebtPaymentModal';
import { DebtScheduleModal } from '../components/DebtScheduleModal';
import type { DebtListItemDto, DebtStatus } from '@shared/api/types/debts';

const STATUS_FILTERS: { value: 'all' | DebtStatus; key: string }[] = [
  { value: 'all', key: 'list_filter_all' },
  { value: 'active', key: 'list_filter_active' },
  { value: 'completed', key: 'list_filter_completed' },
  { value: 'cancelled', key: 'list_filter_cancelled' },
];

export function DebtsPage() {
  const { t } = useTranslation(['debts', 'common']);
  const [statusFilter, setStatusFilter] = useState<'all' | DebtStatus>('active');
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DebtListItemDto | null>(null);
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; debt: DebtListItemDto } | null>(null);

  const debtsQ = useDebtsQuery(statusFilter === 'all' ? undefined : statusFilter);
  const editDebtQ = useDebtQuery(editId);
  const paymentDebtQ = useDebtQuery(paymentId);
  const scheduleDebtQ = useDebtQuery(scheduleId);

  const deleteDebt = useDeleteDebt();

  const debts = useMemo(() => debtsQ.data ?? [], [debtsQ.data]);

  // Stat summary
  const stats = useMemo(() => {
    const active = debts.filter((d) => d.status === 'active');
    const payable = active.filter((d) => d.kind === 'payable').reduce((s, d) => s + d.remainingAmount, 0);
    const receivable = active.filter((d) => d.kind === 'receivable').reduce((s, d) => s + d.remainingAmount, 0);
    const currency = active[0]?.currency ?? 'TRY';
    return { payable, receivable, currency };
  }, [debts]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDebt.mutateAsync(deleteConfirm.id);
      toast.success(t('delete_toastSuccess'));
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('common:errorGeneric')));
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 2.6, md: 4 }, maxWidth: 1280, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('page_eyebrow')}
        title={t('page_title')}
        description={t('page_description')}
        action={
          <Button
            variant="contained"
            size="small"
            startIcon={<Icon icon="mdi:plus" width={16} />}
            onClick={() => setCreateOpen(true)}
            data-tour="debts-new"
            sx={{ px: { xs: 1.4, sm: 1.8 }, py: { xs: 0.7, sm: 0.85 }, fontSize: { xs: '0.78rem', sm: '0.82rem' } }}
          >
            {t('list_create')}
          </Button>
        }
      />

      <PageTourTrigger page="debts" />

      {/* Overview row */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.6}
        sx={{ mb: { xs: 2.4, sm: 3 } }}
      >
        <OverviewTile
          label={t('list_overview_payable')}
          value={stats.payable}
          currency={stats.currency}
          tone="error"
          icon="mdi:credit-card-clock-outline"
        />
        <OverviewTile
          label={t('list_overview_receivable')}
          value={stats.receivable}
          currency={stats.currency}
          tone="success"
          icon="mdi:hand-coin-outline"
        />
      </Stack>

      {/* Filter chips */}
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.8, mb: 2.4 }}>
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.value}
            size="small"
            label={t(f.key)}
            onClick={() => setStatusFilter(f.value)}
            variant={statusFilter === f.value ? 'filled' : 'outlined'}
            color={statusFilter === f.value ? 'primary' : 'default'}
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: { xs: '0.7rem', sm: '0.76rem' },
              height: { xs: 24, sm: 28 },
            }}
          />
        ))}
      </Stack>

      {/* Body */}
      {debtsQ.isLoading ? (
        <Stack spacing={1.4}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" width="100%" height={120} />
          ))}
        </Stack>
      ) : debtsQ.isError ? (
        <EmptyState
          icon="mdi:alert-circle-outline"
          title={t('common:error')}
          action={
            <Button
              variant="contained"
              onClick={() => void debtsQ.refetch()}
              startIcon={<Icon icon="mdi:refresh" width={18} />}
            >
              {t('common:retry')}
            </Button>
          }
        />
      ) : debts.length === 0 ? (
        <EmptyState
          icon="mdi:credit-card-outline"
          title={t('list_empty_title')}
          description={t('list_empty_description')}
          action={
            <Button
              variant="contained"
              size="small"
              startIcon={<Icon icon="mdi:plus" width={16} />}
              onClick={() => setCreateOpen(true)}
              sx={{ px: 2, py: 0.85, fontSize: '0.82rem' }}
            >
              {t('list_create')}
            </Button>
          }
        />
      ) : (
        <Stack spacing={1.4}>
          {debts.map((d, i) => (
            <DebtCard
              key={d.id}
              debt={d}
              index={i}
              onMenu={(anchor) => setRowMenu({ anchor, debt: d })}
              onAddPayment={() => setPaymentId(d.id)}
              onSchedule={() => setScheduleId(d.id)}
            />
          ))}
        </Stack>
      )}

      {/* Row menu */}
      <Menu
        anchorEl={rowMenu?.anchor ?? null}
        open={Boolean(rowMenu)}
        onClose={() => setRowMenu(null)}
        slotProps={{ paper: { sx: { minWidth: 200, border: '1px solid', borderColor: 'divider' } } }}
      >
        {rowMenu && rowMenu.debt.status === 'active' && (
          <MenuItem onClick={() => { setPaymentId(rowMenu.debt.id); setRowMenu(null); }}>
            <ListItemIcon><Icon icon="mdi:cash-check" width={18} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.86rem' }}>{t('actions_addPayment')}</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => { setScheduleId(rowMenu!.debt.id); setRowMenu(null); }}>
          <ListItemIcon><Icon icon="mdi:calendar-clock" width={18} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.86rem' }}>{t('actions_schedule')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setEditId(rowMenu!.debt.id); setRowMenu(null); }}>
          <ListItemIcon><Icon icon="mdi:pencil-outline" width={18} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.86rem' }}>{t('actions_edit')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => { setDeleteConfirm(rowMenu!.debt); setRowMenu(null); }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><Icon icon="mdi:trash-can-outline" width={18} style={{ color: 'currentColor' }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.86rem' }}>{t('actions_delete')}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Modals */}
      <DebtFormModal open={createOpen} onClose={() => setCreateOpen(false)} mode="create" />
      {editId !== null && editDebtQ.data && (
        <DebtFormModal
          open={editId !== null}
          onClose={() => setEditId(null)}
          mode="edit"
          debt={editDebtQ.data}
        />
      )}
      {paymentId !== null && paymentDebtQ.data && (
        <DebtPaymentModal
          open={paymentId !== null}
          onClose={() => setPaymentId(null)}
          debt={paymentDebtQ.data}
        />
      )}
      {scheduleId !== null && scheduleDebtQ.data && (
        <DebtScheduleModal
          open={scheduleId !== null}
          onClose={() => setScheduleId(null)}
          debt={scheduleDebtQ.data}
        />
      )}

      {/* Row-action detayı yüklenirken/başarısızken: boş modal yerine net geri bildirim. */}
      <DetailFetchModal
        open={editId !== null && !editDebtQ.data}
        loading={editDebtQ.isLoading}
        onClose={() => setEditId(null)}
      />
      <DetailFetchModal
        open={paymentId !== null && !paymentDebtQ.data}
        loading={paymentDebtQ.isLoading}
        onClose={() => setPaymentId(null)}
      />
      <DetailFetchModal
        open={scheduleId !== null && !scheduleDebtQ.data}
        loading={scheduleDebtQ.isLoading}
        onClose={() => setScheduleId(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        tone="error"
        icon="mdi:trash-can-outline"
        title={t('delete_confirmTitle')}
        body={deleteConfirm ? t('delete_confirmBody', { title: deleteConfirm.title }) : ''}
        confirmLabel={t('actions_delete')}
        isPending={deleteDebt.isPending}
      />
    </Box>
  );
}

/**
 * Row-action detayı (edit/payment/schedule) çekilirken modal yerine boş ekran
 * göstermek yerine: yüklenirken spinner, hata olursa net hata mesajı + kapat.
 */
function DetailFetchModal({
  open,
  loading,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation(['debts', 'common']);
  return (
    <ZoomModal open={open} onClose={onClose} icon="mdi:credit-card-outline" maxWidth={460}>
      <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ py: 6 }}>
        {loading ? (
          <>
            <CircularProgress size={28} thickness={5} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('common:loading')}
            </Typography>
          </>
        ) : (
          <>
            <Icon icon="mdi:alert-circle-outline" width={32} style={{ color: 'var(--pr-halt)' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('common:error')}
            </Typography>
            <Button variant="text" onClick={onClose}>
              {t('common:close')}
            </Button>
          </>
        )}
      </Stack>
    </ZoomModal>
  );
}

interface OverviewTileProps {
  label: string;
  value: number;
  currency: string;
  tone: 'error' | 'success';
  icon: string;
}

function OverviewTile({ label, value, currency, tone, icon }: OverviewTileProps) {
  return (
    <SurfaceCard
      padding={0}
      sx={{
        flex: 1,
        p: { xs: 2, sm: 2.4 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.4}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.4,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            bgcolor: (th) => alpha(th.palette[tone].main, th.palette.mode === 'dark' ? 0.16 : 0.1),
            color: `${tone}.main`,
          }}
        >
          <Icon icon={icon} width={20} />
        </Box>
        <Stack sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.62rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'text.disabled',
            }}
            noWrap
          >
            {label}
          </Typography>
          <Money value={value} currency={currency} size="md" weight={600} />
        </Stack>
      </Stack>
    </SurfaceCard>
  );
}

interface DebtCardProps {
  debt: DebtListItemDto;
  index: number;
  onMenu: (anchor: HTMLElement) => void;
  onAddPayment: () => void;
  onSchedule: () => void;
}

function DebtCard({ debt, index, onMenu, onAddPayment, onSchedule }: DebtCardProps) {
  const { t } = useTranslation('debts');
  const isPayable = debt.kind === 'payable';
  const tone = isPayable ? 'error' : 'success';
  const paid = debt.amount - debt.remainingAmount;
  const pct = debt.amount > 0 ? Math.min(100, Math.max(0, (paid / debt.amount) * 100)) : 0;

  const now = dayjs();
  const next = debt.nextDueDate ? dayjs(debt.nextDueDate) : null;
  const daysUntil = next ? next.diff(now, 'day') : null;
  const isOverdue = daysUntil !== null && daysUntil < 0 && debt.status === 'active';
  const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3 && debt.status === 'active';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
    >
      <SurfaceCard
        padding={0}
        sx={{
          p: { xs: 2, sm: 2.4 },
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '3px solid',
          borderLeftColor: `${tone}.main`,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.6, sm: 2 }} alignItems={{ sm: 'center' }}>
          {/* Left: kind icon + title + counterparty */}
          <Stack direction="row" spacing={1.4} alignItems="center" sx={{ flex: 1.4, minWidth: 0 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.4,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                bgcolor: (th) => alpha(th.palette[tone].main, th.palette.mode === 'dark' ? 0.16 : 0.1),
                color: `${tone}.main`,
              }}
            >
              <Icon
                icon={isPayable ? 'mdi:credit-card-clock-outline' : 'mdi:hand-coin-outline'}
                width={22}
              />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.05rem', lineHeight: 1.2 }} noWrap>
                {debt.title}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }} noWrap>
                {t(`kind_${debt.kind}_short`)} · {debt.counterpartyName}
              </Typography>
            </Box>
          </Stack>

          {/* Middle: progress + remaining */}
          <Stack sx={{ flex: 1.2, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '0.62rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'text.disabled',
                }}
              >
                {t('card_remaining')}
              </Typography>
              <Money value={debt.remainingAmount} currency={debt.currency} size="md" weight={600} />
            </Stack>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                mt: 0.6,
                height: 5,
                borderRadius: 99,
                bgcolor: (th) => alpha(th.palette[tone].main, 0.1),
                '& .MuiLinearProgress-bar': { bgcolor: `${tone}.main`, borderRadius: 99 },
              }}
            />
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
                {t('common:percentValue', { value: Math.round(pct) })} {t('card_paid')}
              </Typography>
              {next && debt.status === 'active' && (
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: 500,
                    color: isOverdue ? 'error.main' : isDueSoon ? 'warning.main' : 'text.secondary',
                  }}
                >
                  {isOverdue
                    ? t('card_overdue')
                    : t('card_dueIn', { days: daysUntil })}
                </Typography>
              )}
            </Stack>
          </Stack>

          {/* Actions */}
          <Stack direction="row" spacing={0.4} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
            <Tooltip title={t('actions_schedule')} arrow>
              <IconButton size="small" onClick={onSchedule} aria-label={t('actions_schedule')}>
                <Icon icon="mdi:calendar-clock" width={18} />
              </IconButton>
            </Tooltip>
            {debt.status === 'active' && (
              <Tooltip title={t('actions_addPayment')} arrow>
                <IconButton size="small" onClick={onAddPayment} color="primary" aria-label={t('actions_addPayment')}>
                  <Icon icon="mdi:cash-check" width={18} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={t('actions_edit')} arrow>
              <IconButton size="small" onClick={(e) => onMenu(e.currentTarget)} aria-label={t('actions_edit')}>
                <Icon icon="mdi:dots-vertical" width={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </SurfaceCard>
    </motion.div>
  );
}
