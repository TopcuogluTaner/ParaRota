import { useState } from 'react';
import { Box, Button, Chip, Grid, IconButton, Skeleton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
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
import { formatNumber, formatDate } from '@shared/lib/dateFormat';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { ASSET_ICON, ASSET_COLOR } from '@shared/lib/assetMeta';
import type { HoldingDto } from '@shared/api/types';
import { usePortfolioQuery, useDeleteHolding } from '../api/useInvestments';
import { InvestmentFormModal } from '../components/InvestmentFormModal';
import { SellHoldingModal } from '../components/SellHoldingModal';

export function InvestmentsPage() {
  const { t } = useTranslation(['investments', 'common']);
  const fmtMoney = useMoneyFmt(); // gizlilik modunda tutarları maskeler (yüzde/adet maskelenmez)
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HoldingDto | null>(null);
  const [sellTarget, setSellTarget] = useState<HoldingDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HoldingDto | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = usePortfolioQuery();
  const deleteMutation = useDeleteHolding();

  const items = data?.items ?? [];
  const pnlPositive = (data?.totalProfitLoss ?? 0) >= 0;

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };
  const openEdit = (h: HoldingDto) => {
    setEditTarget(h);
    setFormOpen(true);
  };
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t('toast_delete'));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('toast_error')));
    }
  };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 1280, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
        action={
          <Button variant="contained" startIcon={<Icon icon="mdi:plus" width={18} />} onClick={openCreate} data-tour="investments-new">
            {t('newButton')}
          </Button>
        }
      />

      <PageTourTrigger page="investments" />

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label={t('stat_invested')} value={data?.totalInvested ?? 0} icon="mdi:cash" tone="ink" index={0} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label={t('stat_value')} value={data?.totalCurrentValue ?? 0} icon="mdi:scale-balance" tone="sky" index={1} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label={t('stat_pnl')} value={data?.totalProfitLoss ?? 0} icon={pnlPositive ? 'mdi:trending-up' : 'mdi:trending-down'} tone={pnlPositive ? 'go' : 'halt'} index={2} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label={t('stat_pnlPct')} value={data?.totalProfitLossPct ?? 0} unit="%" icon="mdi:percent-outline" tone={pnlPositive ? 'go' : 'halt'} index={3} loading={isLoading} />
        </Grid>
      </Grid>

      {data?.lastUpdated && (
        <Typography sx={{ mb: 2, fontSize: '0.78rem', color: 'text.secondary' }}>
          {t('lastUpdated')}: {formatDate(data.lastUpdated)}
        </Typography>
      )}

      {isLoading ? (
        <Stack spacing={1.5}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SurfaceCard key={i} padding={2}>
              <Skeleton variant="text" width="60%" height={28} />
              <Skeleton variant="text" width="40%" height={18} />
            </SurfaceCard>
          ))}
        </Stack>
      ) : isError ? (
        <EmptyState
          icon="mdi:alert-circle-outline"
          title={t('error_title')}
          action={
            <Button variant="contained" onClick={() => void refetch()} startIcon={<Icon icon="mdi:refresh" width={18} />}>
              {t('error_retry')}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="mdi:chart-line-variant"
          title={t('empty_title')}
          description={t('empty_description')}
          action={
            <Button variant="contained" startIcon={<Icon icon="mdi:plus" width={18} />} onClick={openCreate}>
              {t('empty_action')}
            </Button>
          }
        />
      ) : (
        <Stack spacing={1.5} sx={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity .2s' }}>
          {items.map((h) => {
            const positive = h.profitLoss >= 0;
            const isGold = h.assetType === 'goldGram';
            const priceKnown = h.currentUnitPrice > 0;
            const accent = ASSET_COLOR[h.assetType];
            return (
              <SurfaceCard key={h.id} padding={2}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 42, height: 42, borderRadius: 1.6, display: 'grid', placeItems: 'center', flexShrink: 0,
                      bgcolor: alpha(accent, 0.12), color: accent,
                    }}
                  >
                    <Icon icon={ASSET_ICON[h.assetType]} width={22} />
                  </Box>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 600 }} noWrap>
                      {h.assetType === 'tefasFund' ? (h.fundName || h.fundCode || t('asset_tefasFund')) : t(`asset_${h.assetType}`)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                      {h.assetType === 'tefasFund' && h.fundCode ? `${h.fundCode} · ` : ''}
                      {formatNumber(h.quantity, isGold ? 4 : h.quantity < 1 ? 8 : 2)} {isGold ? t('unit_gram_short') : ''} · {formatDate(h.purchaseDate)}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontWeight: 600, fontFamily: '"Geist Mono", monospace' }}>
                      {fmtMoney(h.currentValue)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                      {t('cost')}: {fmtMoney(h.investedAmount)}
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    icon={priceKnown ? <Icon icon={positive ? 'mdi:trending-up' : 'mdi:trending-down'} width={15} /> : undefined}
                    color={priceKnown ? (positive ? 'success' : 'error') : 'default'}
                    variant="outlined"
                    label={priceKnown ? `${positive ? '+' : ''}${formatNumber(h.profitLossPct, 1)}%` : t('price_pending')}
                    sx={{ fontFamily: '"Geist Mono", monospace', minWidth: 72 }}
                  />

                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" color="success" onClick={() => setSellTarget(h)} aria-label={t('sell_action')}>
                      <Icon icon="mdi:cash-multiple" width={18} />
                    </IconButton>
                    <IconButton size="small" onClick={() => openEdit(h)} aria-label={t('common:edit')}>
                      <Icon icon="mdi:pencil-outline" width={18} />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteTarget(h)} aria-label={t('common:delete')}>
                      <Icon icon="mdi:trash-can-outline" width={18} />
                    </IconButton>
                  </Stack>
                </Stack>
              </SurfaceCard>
            );
          })}
        </Stack>
      )}

      <InvestmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={editTarget ? 'edit' : 'create'}
        holding={editTarget ?? undefined}
      />

      <SellHoldingModal open={sellTarget !== null} onClose={() => setSellTarget(null)} holding={sellTarget} />

      <DeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t('delete_title')}
        description={t('delete_description')}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
