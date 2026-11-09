import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
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
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Money } from '@shared/components/Money';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import {
  useInstallmentPlansQuery,
  useUpdateInstallmentPlan,
  useDeleteInstallmentPlan,
} from '../api/useInstallments';
import { InstallmentCard } from '../components/InstallmentCard';
import { InstallmentFormModal } from '../components/InstallmentFormModal';
import { ReliefTimeline, type ReliefGroup } from '../components/ReliefTimeline';
import { planState, amountInMonth } from '../lib/installmentMath';
import type { RecurringRuleDto } from '@shared/api/types';

/**
 * Taksitler sayfası — ekranın cevapladığı ilk soru: "bu ay taksitlere ne kadar
 * gidiyor?" (hero). Altında plan kartları (k/n ilerleme) ve rahatlama takvimi
 * (planlar bitince aylık yükün ne kadar azalacağı).
 */
export function InstallmentsPage() {
  const { t } = useTranslation(['installments', 'common']);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRuleDto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RecurringRuleDto | null>(null);
  const [confirmClose, setConfirmClose] = useState<RecurringRuleDto | null>(null);
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; plan: RecurringRuleDto } | null>(null);

  const plansQ = useInstallmentPlansQuery();
  const del = useDeleteInstallmentPlan();
  const closeUpdate = useUpdateInstallmentPlan();

  const plans = useMemo(
    () => [...(plansQ.data ?? [])].sort((a, b) => b.id - a.id),
    [plansQ.data],
  );

  // Hero: bu ayki toplam taksit yükü (kapatılmış planlar hariç).
  const thisMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const open = plans.filter((r) => planState(r) !== 'closed');
    const total = open.reduce((sum, r) => sum + amountInMonth(r, y, m), 0);
    const count = open.filter((r) => amountInMonth(r, y, m) > 0).length;
    return { total, count };
  }, [plans]);

  // Rahatlama takvimi: aktif planları bitiş ayına göre grupla.
  const relief = useMemo<ReliefGroup[]>(() => {
    const now = new Date();
    const map = new Map<string, ReliefGroup>();
    for (const r of plans) {
      if (planState(r) !== 'active' || !r.endDate) continue;
      const end = new Date(r.endDate);
      if (end < now) continue;
      const key = `${end.getFullYear()}-${end.getMonth()}`;
      const cur = map.get(key) ?? { y: end.getFullYear(), m: end.getMonth(), amount: 0 };
      cur.amount += r.amount;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => a.y - b.y || a.m - b.m).slice(0, 6);
  }, [plans]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await del.mutateAsync(confirmDelete.id);
      toast.success(t('toast_deleted'));
      setConfirmDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  // Erken kapatma = endDate'i bugüne çek + pasifleştir; motor bir daha taksit
  // üretmez, geçmiş işlemler defterde aynen kalır. Kilitli alanlar entity'den
  // aynen geri gönderilir (INSTALLMENT_RULE_LOCKED guard'ı).
  const handleCloseEarly = async () => {
    const r = confirmClose;
    if (!r) return;
    try {
      await closeUpdate.mutateAsync({
        id: r.id,
        body: {
          description: r.description,
          nature: r.nature,
          categoryId: r.categoryId,
          amount: r.amount,
          currency: r.currency,
          frequency: r.frequency,
          startDate: r.startDate,
          endDate: new Date().toISOString(),
          autoApprove: r.autoApprove,
          isActive: false,
          notes: r.notes,
        },
      });
      toast.success(t('toast_closed'));
      setConfirmClose(null);
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
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
            onClick={openCreate}
            data-tour="installments-new"
            sx={{ px: { xs: 1.4, sm: 1.8 }, py: { xs: 0.7, sm: 0.85 }, fontSize: { xs: '0.78rem', sm: '0.82rem' } }}
          >
            {t('list_create')}
          </Button>
        }
      />

      {plansQ.isLoading ? (
        <Stack spacing={1.4}>
          <Skeleton variant="rounded" width="100%" height={104} />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" width="100%" height={96} />
          ))}
        </Stack>
      ) : plansQ.isError ? (
        <EmptyState
          icon="mdi:alert-circle-outline"
          title={t('common:error')}
          action={
            <Button
              variant="contained"
              onClick={() => void plansQ.refetch()}
              startIcon={<Icon icon="mdi:refresh" width={18} />}
            >
              {t('common:retry')}
            </Button>
          }
        />
      ) : plans.length === 0 ? (
        <EmptyState
          icon="mdi:credit-card-clock-outline"
          title={t('empty_title')}
          description={t('empty_description')}
          action={
            <Button
              variant="contained"
              size="small"
              startIcon={<Icon icon="mdi:plus" width={16} />}
              onClick={openCreate}
              sx={{ px: 2, py: 0.85, fontSize: '0.82rem' }}
            >
              {t('list_create')}
            </Button>
          }
        />
      ) : (
        <>
          {/* Hero: bu ayki taksit yükü */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SurfaceCard
              padding={0}
              waypoint
              sx={{ p: { xs: 2.2, sm: 2.8 }, mb: { xs: 2, lg: 2.4 }, position: 'relative', overflow: 'hidden' }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 1.6, sm: 2.4 }}
                alignItems={{ sm: 'flex-end' }}
                justifyContent="space-between"
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: 1.2,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: (th) => alpha(th.palette.error.main, th.palette.mode === 'dark' ? 0.16 : 0.1),
                        color: 'error.main',
                      }}
                    >
                      <Icon icon="mdi:credit-card-clock-outline" width={17} />
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: '"Geist Mono", monospace',
                        fontSize: '0.64rem',
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        color: 'text.disabled',
                      }}
                    >
                      {t('hero_label')}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.2} alignItems="baseline">
                    <Money
                      value={thisMonth.total}
                      size="xl"
                      weight={600}
                      tone={thisMonth.total > 0 ? 'halt' : 'mute'}
                    />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {t('hero_hint', { count: thisMonth.count })}
                    </Typography>
                  </Stack>
                </Box>
                <Typography
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: '0.7rem',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'text.disabled',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('plansLabel', { count: plans.length })}
                </Typography>
              </Stack>
            </SurfaceCard>
          </motion.div>

          {/* Plan kartları + rahatlama takvimi */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: relief.length > 0 ? 'minmax(0, 1fr) 320px' : '1fr' },
              gap: { xs: 2, lg: 2.4 },
              alignItems: 'start',
            }}
          >
            <Stack spacing={1.4} sx={{ minWidth: 0 }}>
              {plans.map((p, i) => (
                <InstallmentCard
                  key={p.id}
                  plan={p}
                  index={i}
                  onMenu={(anchor) => setRowMenu({ anchor, plan: p })}
                />
              ))}
            </Stack>

            {relief.length > 0 && (
              <Box sx={{ position: { lg: 'sticky' }, top: { lg: 24 } }}>
                <ReliefTimeline groups={relief} />
              </Box>
            )}
          </Box>
        </>
      )}

      {/* Satır menüsü: düzenle / kalanını kapat / sil */}
      <Menu
        anchorEl={rowMenu?.anchor ?? null}
        open={Boolean(rowMenu)}
        onClose={() => setRowMenu(null)}
        slotProps={{ paper: { sx: { minWidth: 200, border: '1px solid', borderColor: 'divider' } } }}
      >
        <MenuItem
          onClick={() => {
            setEditing(rowMenu!.plan);
            setFormOpen(true);
            setRowMenu(null);
          }}
        >
          <ListItemIcon><Icon icon="mdi:pencil-outline" width={18} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.86rem' }}>{t('common:edit')}</ListItemText>
        </MenuItem>
        {rowMenu && planState(rowMenu.plan) === 'active' && (
          <MenuItem
            onClick={() => {
              setConfirmClose(rowMenu.plan);
              setRowMenu(null);
            }}
            sx={{ color: 'warning.main' }}
          >
            <ListItemIcon><Icon icon="mdi:stop-circle-outline" width={18} style={{ color: 'currentColor' }} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.86rem' }}>{t('actions_close')}</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setConfirmDelete(rowMenu!.plan);
            setRowMenu(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><Icon icon="mdi:trash-can-outline" width={18} style={{ color: 'currentColor' }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.86rem' }}>{t('common:delete')}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Modallar */}
      <InstallmentFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        rule={editing}
      />

      <ConfirmDialog
        open={Boolean(confirmClose)}
        onClose={() => setConfirmClose(null)}
        onConfirm={handleCloseEarly}
        tone="warning"
        icon="mdi:stop-circle-outline"
        title={t('close_confirmTitle')}
        body={t('close_confirmBody')}
        confirmLabel={t('actions_close')}
        isPending={closeUpdate.isPending}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        tone="error"
        icon="mdi:trash-can-outline"
        title={t('delete_confirmTitle')}
        body={t('delete_confirmBody')}
        confirmLabel={t('common:delete')}
        isPending={del.isPending}
      />
    </Box>
  );
}
