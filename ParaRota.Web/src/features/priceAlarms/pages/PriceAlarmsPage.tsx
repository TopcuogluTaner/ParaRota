import { useMemo, useState } from 'react';
import { Box, Button, ButtonBase, Chip, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { SectionHeader } from '@shared/components/SectionHeader';
import { EmptyState } from '@shared/components/EmptyState';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { formatDate } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { ASSET_ICON, ASSET_COLOR } from '@shared/lib/assetMeta';
import type { AlarmStatus, PriceAlarmDto } from '@shared/api/types';
import { usePriceAlarmsQuery, useDeletePriceAlarm, useRearmPriceAlarm } from '../api/usePriceAlarms';
import { PriceAlarmModal } from '../components/PriceAlarmModal';

type Filter = 'all' | AlarmStatus;
const FILTERS: Filter[] = ['all', 'active', 'triggered'];

export function PriceAlarmsPage() {
  const { t } = useTranslation(['priceAlarms', 'investments', 'common']);
  const fmtMoney = useMoneyFmt();
  const [filter, setFilter] = useState<Filter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PriceAlarmDto | undefined>(undefined);
  const [toDelete, setToDelete] = useState<PriceAlarmDto | null>(null);

  const { data, isLoading } = usePriceAlarmsQuery(filter === 'all' ? undefined : filter);
  const del = useDeletePriceAlarm();
  const rearm = useRearmPriceAlarm();

  const counts = useMemo(() => {
    const active = data?.filter((a) => a.status === 'active').length ?? 0;
    const triggered = data?.filter((a) => a.status === 'triggered').length ?? 0;
    return { active, triggered };
  }, [data]);

  const openCreate = () => { setEditing(undefined); setModalOpen(true); };
  const openEdit = (a: PriceAlarmDto) => { setEditing(a); setModalOpen(true); };

  const handleRearm = async (a: PriceAlarmDto) => {
    try { await rearm.mutateAsync(a.id); toast.success(t('rearmed')); }
    catch (err) { toast.error(getErrorMessage(err, t('common:errorGeneric'))); }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try { await del.mutateAsync(toDelete.id); toast.success(t('deleted')); setToDelete(null); }
    catch (err) { toast.error(getErrorMessage(err, t('common:errorGeneric'))); }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 2.6, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('page_eyebrow')}
        title={t('page_title')}
        description={t('page_description')}
        action={
          <Button variant="contained" onClick={openCreate} startIcon={<Icon icon="mdi:plus" width={18} />} sx={{ borderRadius: 999, fontWeight: 700 }}>
            {t('new')}
          </Button>
        }
      />

      {/* Filtre sekmeleri */}
      <Box sx={{ display: 'inline-flex', p: 0.4, mb: 2.4, borderRadius: 999, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default', maxWidth: '100%', overflowX: 'auto' }}>
        {FILTERS.map((f) => {
          const on = filter === f;
          const badge = f === 'active' ? counts.active : f === 'triggered' ? counts.triggered : undefined;
          return (
            <ButtonBase key={f} onClick={() => setFilter(f)} aria-pressed={on}
              sx={{ px: 2, py: 0.8, borderRadius: 999, fontSize: '0.82rem', fontWeight: on ? 700 : 500, whiteSpace: 'nowrap',
                bgcolor: on ? 'text.primary' : 'transparent', color: on ? 'background.paper' : 'text.secondary', transition: 'all .15s' }}>
              {t(`filter_${f}`)}{badge ? ` · ${badge}` : ''}
            </ButtonBase>
          );
        })}
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 1.6, md: 2 } }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={132} sx={{ borderRadius: 2.5 }} />)}
        </Box>
      ) : !data || data.length === 0 ? (
        <EmptyState icon="mdi:bell-plus-outline" title={t('empty_title')} description={t('empty_hint')}
          action={<Button variant="contained" onClick={openCreate} startIcon={<Icon icon="mdi:plus" width={18} />}>{t('new')}</Button>} />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 1.6, md: 2 } }}>
          {data.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}>
              <AlarmCard
                a={a} fmtMoney={fmtMoney}
                onEdit={() => openEdit(a)} onDelete={() => setToDelete(a)}
                onRearm={() => handleRearm(a)} rearmPending={rearm.isPending}
              />
            </motion.div>
          ))}
        </Box>
      )}

      <PriceAlarmModal open={modalOpen} onClose={() => setModalOpen(false)} alarm={editing} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title={t('delete_title')}
        body={t('delete_body')}
        tone="error"
        isPending={del.isPending}
      />
    </Box>
  );
}

interface CardProps {
  a: PriceAlarmDto;
  fmtMoney: (v: number) => string;
  onEdit: () => void;
  onDelete: () => void;
  onRearm: () => void;
  rearmPending: boolean;
}

function AlarmCard({ a, fmtMoney, onEdit, onDelete, onRearm, rearmPending }: CardProps) {
  const { t } = useTranslation(['priceAlarms', 'investments', 'common']);
  const accent = ASSET_COLOR[a.assetType];
  const triggered = a.status === 'triggered';
  const isAbove = a.direction === 'above';
  const dirTint = isAbove ? 'success.main' : 'error.main';

  return (
    <Box sx={{ position: 'relative', p: { xs: 2, sm: 2.2 }, height: '100%', bgcolor: 'background.paper', border: '1px solid',
      borderColor: triggered ? (th) => alpha(th.palette.warning.main, 0.5) : 'divider', borderRadius: 2.5,
      boxShadow: triggered ? (th) => `0 0 0 1px ${alpha(th.palette.warning.main, 0.25)}` : 'none' }}>
      <Stack direction="row" spacing={1.6} alignItems="flex-start">
        <Box sx={{ width: 42, height: 42, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', color: accent, bgcolor: alpha(accent, 0.14) }}>
          <Icon icon={ASSET_ICON[a.assetType]} width={24} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.96rem' }} noWrap>
              {a.assetType === 'tefasFund' ? (a.fundCode || a.fundName || t('investments:asset_tefasFund')) : t(`investments:asset_short_${a.assetType}`)}
            </Typography>
            <Chip size="small" label={t(`dir_${a.direction}`)}
              icon={<Icon icon={isAbove ? 'mdi:trending-up' : 'mdi:trending-down'} width={14} />}
              sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600, color: dirTint, bgcolor: (th) => alpha(isAbove ? th.palette.success.main : th.palette.error.main, 0.12), '& .MuiChip-icon': { color: dirTint } }} />
            {triggered && (
              <Chip size="small" label={t('status_triggered')} icon={<Icon icon="mdi:bell-ring" width={13} />}
                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, color: 'warning.dark', bgcolor: (th) => alpha(th.palette.warning.main, 0.16), '& .MuiChip-icon': { color: 'warning.dark' } }} />
            )}
          </Stack>

          <Typography sx={{ mt: 0.6, fontFamily: '"Geist Mono", monospace', fontSize: '1.18rem', fontWeight: 700, lineHeight: 1.2 }}>
            {fmtMoney(a.thresholdPrice)}
          </Typography>

          <Stack direction="row" spacing={1.4} sx={{ mt: 0.4, flexWrap: 'wrap' }}>
            {a.currentPrice != null && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('current_price')}: <strong>{fmtMoney(a.currentPrice)}</strong>
              </Typography>
            )}
            {triggered && a.triggeredPrice != null && a.triggeredAt && (
              <Typography variant="caption" sx={{ color: 'warning.dark' }}>
                {t('triggered_at', { price: fmtMoney(a.triggeredPrice), date: formatDate(a.triggeredAt) })}
              </Typography>
            )}
          </Stack>

          {a.note && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.6, color: 'text.disabled', fontStyle: 'italic' }}>
              {a.note}
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Aksiyonlar */}
      <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 8, right: 8 }}>
        {triggered && (
          <Tooltip title={t('rearm')}>
            <span>
              <IconButton size="small" onClick={onRearm} disabled={rearmPending} aria-label={t('rearm')} sx={{ color: 'primary.main' }}>
                <Icon icon="mdi:bell-check-outline" width={18} />
              </IconButton>
            </span>
          </Tooltip>
        )}
        <Tooltip title={t('common:edit')}>
          <IconButton size="small" onClick={onEdit} aria-label={t('common:edit')}>
            <Icon icon="mdi:pencil-outline" width={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('common:delete')}>
          <IconButton size="small" onClick={onDelete} aria-label={t('common:delete')} sx={{ color: 'error.main' }}>
            <Icon icon="mdi:trash-can-outline" width={18} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
