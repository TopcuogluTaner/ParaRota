import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { ZoomModal } from '@shared/components/ZoomModal';
import { DeleteModal } from '@shared/components/DeleteModal';
import { Money } from '@shared/components/Money';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import { parseAmount } from '@shared/lib/parseAmount';
import type { RecurringFrequency, SubscriptionCatalogItemDto } from '@shared/api/types';
import {
  useSubscriptionCatalogAdminList,
  useCreateCatalogItem,
  useUpdateCatalogItem,
  useDeleteCatalogItem,
} from '../api/useSubscriptionCatalogAdmin';

const FREQUENCIES: RecurringFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];
const FREQ_LABELS: Record<RecurringFrequency, string> = {
  daily: 'recurring.freqDaily',
  weekly: 'recurring.freqWeekly',
  monthly: 'recurring.freqMonthly',
  yearly: 'recurring.freqYearly',
};

interface FormState {
  key: string;
  name: string;
  icon: string;
  color: string;
  amount: string;
  currency: string;
  frequency: RecurringFrequency;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  key: '',
  name: '',
  icon: 'mdi:autorenew',
  color: '#7B6CA5',
  amount: '',
  currency: 'TRY',
  frequency: 'monthly',
  sortOrder: '0',
  isActive: true,
};

function fromItem(item: SubscriptionCatalogItemDto): FormState {
  return {
    key: item.key,
    name: item.name,
    icon: item.icon,
    color: item.color,
    amount: String(item.suggestedAmount),
    currency: item.currency,
    frequency: item.frequency,
    sortOrder: String(item.sortOrder),
    isActive: item.isActive,
  };
}

/**
 * Abonelik kataloğu yönetimi — fiyatların resmi API'si olmadığından admin buradan
 * elle günceller; değişiklik deploy/mağaza review gerektirmeden tüm istemcilere yansır.
 */
export function SubscriptionCatalogAdmin() {
  const { t } = useTranslation(['pages', 'common']);
  const { data, isLoading, isError } = useSubscriptionCatalogAdminList();
  const createMutation = useCreateCatalogItem();
  const updateMutation = useUpdateCatalogItem();
  const deleteMutation = useDeleteCatalogItem();

  const [editTarget, setEditTarget] = useState<SubscriptionCatalogItemDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionCatalogItemDto | null>(null);

  useEffect(() => {
    if (!formOpen) return;
    // Modal her açılışta hedefe göre formu sıfırlar/doldurur (form state hook'larıyla aynı pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(editTarget ? fromItem(editTarget) : EMPTY);
  }, [formOpen, editTarget]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const amountNum = parseAmount(form.amount);
  const canSubmit =
    form.name.trim().length > 0 &&
    form.icon.trim().length > 0 &&
    /^#[0-9A-Fa-f]{6}$/.test(form.color.trim()) &&
    !Number.isNaN(amountNum) &&
    amountNum > 0 &&
    (editTarget !== null || /^[a-z0-9-]+$/.test(form.key.trim()));

  const handleSubmit = async () => {
    if (!canSubmit || isSaving) return;
    const body = {
      name: form.name.trim(),
      icon: form.icon.trim(),
      color: form.color.trim(),
      suggestedAmount: amountNum,
      currency: form.currency.trim().toUpperCase(),
      frequency: form.frequency,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, body });
      } else {
        await createMutation.mutateAsync({ ...body, key: form.key.trim() });
      }
      toast.success(t('admin.catalog_toastSaved'));
      setFormOpen(false);
      setEditTarget(null);
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('common:errorGeneric')));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t('admin.catalog_toastDeleted'));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('common:errorGeneric')));
    }
  };

  return (
    <SurfaceCard padding={2.6}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.1rem' }}>
            {t('admin.module_subscriptionCatalog_title')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
            {t('admin.catalog_hint')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<Icon icon="mdi:plus" width={16} />}
          onClick={() => { setEditTarget(null); setFormOpen(true); }}
        >
          {t('admin.catalog_addButton')}
        </Button>
      </Stack>

      {isLoading ? (
        <Stack spacing={1}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : isError ? (
        <Box sx={{ py: 4, textAlign: 'center', color: 'warning.main' }}>
          <Icon icon="mdi:lock-alert-outline" width={32} />
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', maxWidth: 420, mx: 'auto' }}>
            {t('admin.loadError')}
          </Typography>
        </Box>
      ) : (data ?? []).length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>
          <Icon icon="mdi:autorenew" width={32} />
          <Typography variant="body2" sx={{ mt: 1 }}>{t('admin.catalog_empty')}</Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {(data ?? []).map((item) => (
            <Stack
              key={item.id}
              direction="row"
              alignItems="center"
              spacing={1.4}
              sx={{
                p: 1.2,
                borderRadius: 1.6,
                border: '1px solid',
                borderColor: 'divider',
                opacity: item.isActive ? 1 : 0.55,
              }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: alpha(item.color, 0.14),
                  color: item.color,
                  flexShrink: 0,
                }}
              >
                <Icon icon={item.icon} width={17} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {item.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.disabled', fontFamily: '"Geist Mono", monospace', textTransform: 'none', letterSpacing: 0 }}
                >
                  {item.key} · {t(FREQ_LABELS[item.frequency])}
                  {!item.isActive && ` · ${t('recurring.tabPaused')}`}
                </Typography>
              </Box>
              <Money value={item.suggestedAmount} currency={item.currency} size="sm" weight={600} />
              <Tooltip title={t('common:edit')} arrow>
                <IconButton
                  size="small"
                  aria-label={t('common:edit')}
                  onClick={() => { setEditTarget(item); setFormOpen(true); }}
                >
                  <Icon icon="mdi:pencil-outline" width={15} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common:delete')} arrow>
                <IconButton
                  size="small"
                  aria-label={t('common:delete')}
                  onClick={() => setDeleteTarget(item)}
                  sx={{ '&:hover': { color: 'error.main' } }}
                >
                  <Icon icon="mdi:trash-can-outline" width={15} />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </Stack>
      )}

      <ZoomModal
        open={formOpen}
        onClose={() => { if (!isSaving) { setFormOpen(false); setEditTarget(null); } }}
        title={editTarget ? t('admin.catalog_editTitle') : t('admin.catalog_createTitle')}
        icon="mdi:autorenew"
        actions={
          <Button variant="contained" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <CircularProgress size={18} /> : t('common:save')}
          </Button>
        }
      >
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {!editTarget && (
            <TextField
              label={t('admin.catalog_field_key')}
              value={form.key}
              onChange={(e) => set('key', e.target.value)}
              size="small"
              helperText={t('admin.catalog_field_keyHint')}
            />
          )}
          <TextField
            label={t('admin.catalog_field_name')}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            size="small"
          />
          <Stack direction="row" spacing={1.5}>
            <TextField
              label={t('admin.catalog_field_icon')}
              value={form.icon}
              onChange={(e) => set('icon', e.target.value)}
              size="small"
              sx={{ flex: 1 }}
            />
            <TextField
              label={t('admin.catalog_field_color')}
              value={form.color}
              onChange={(e) => set('color', e.target.value)}
              size="small"
              sx={{ width: 130 }}
            />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField
              label={t('admin.catalog_field_amount')}
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              size="small"
              sx={{ flex: 1 }}
            />
            <TextField
              label={t('admin.catalog_field_currency')}
              value={form.currency}
              onChange={(e) => set('currency', e.target.value)}
              size="small"
              sx={{ width: 100 }}
            />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField
              select
              label={t('admin.catalog_field_frequency')}
              value={form.frequency}
              onChange={(e) => set('frequency', e.target.value as RecurringFrequency)}
              size="small"
              sx={{ flex: 1 }}
            >
              {FREQUENCIES.map((f) => (
                <MenuItem key={f} value={f}>
                  {t(FREQ_LABELS[f])}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('admin.catalog_field_sortOrder')}
              value={form.sortOrder}
              onChange={(e) => set('sortOrder', e.target.value.replace(/[^0-9]/g, ''))}
              size="small"
              sx={{ width: 100 }}
            />
          </Stack>
          <FormControlLabel
            control={<Switch checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />}
            label={t('admin.catalog_field_active')}
          />
        </Stack>
      </ZoomModal>

      <DeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('admin.catalog_deleteTitle')}
        description={t('admin.catalog_deleteDescription')}
        loading={deleteMutation.isPending}
      />
    </SurfaceCard>
  );
}
