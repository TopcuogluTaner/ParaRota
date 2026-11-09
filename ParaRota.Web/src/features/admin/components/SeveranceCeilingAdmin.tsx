import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Skeleton,
  Stack,
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
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import type { SeveranceCeilingDto } from '@shared/api/types';
import {
  useSeveranceCeilingsAdminList,
  useCreateSeveranceCeiling,
  useUpdateSeveranceCeiling,
  useDeleteSeveranceCeiling,
} from '../api/useSeveranceCeilingsAdmin';

interface FormState {
  effectiveFrom: string;
  amount: string;
  note: string;
}

const EMPTY: FormState = { effectiveFrom: '', amount: '', note: '' };

function fromItem(item: SeveranceCeilingDto): FormState {
  return {
    effectiveFrom: item.effectiveFrom.slice(0, 10),
    amount: formatAmountInput(String(item.amount)),
    note: item.note ?? '',
  };
}

function formatPeriod(iso: string): string {
  // "2026-07-01" → "01.07.2026" (yerel, kütüphanesiz).
  const d = iso.slice(0, 10).split('-');
  return d.length === 3 ? `${d[2]}.${d[1]}.${d[0]}` : iso;
}

/**
 * Kıdem tazminatı tavanı yönetimi — tavan dönemsel (Ocak/Temmuz) değişir ve resmi bir
 * parametre API'si yoktur. Admin yeni dönem tavanını buradan girer; hesap servisi DB'den
 * okur, deploy/kod değişikliği gerekmez. Geçmiş dönemler tarihe göre saklanır.
 */
export function SeveranceCeilingAdmin() {
  const { t } = useTranslation(['pages', 'common']);
  const { data, isLoading, isError } = useSeveranceCeilingsAdminList();
  const createMutation = useCreateSeveranceCeiling();
  const updateMutation = useUpdateSeveranceCeiling();
  const deleteMutation = useDeleteSeveranceCeiling();

  const [editTarget, setEditTarget] = useState<SeveranceCeilingDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<SeveranceCeilingDto | null>(null);

  useEffect(() => {
    if (!formOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(editTarget ? fromItem(editTarget) : EMPTY);
  }, [formOpen, editTarget]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const amountNum = parseAmount(form.amount);
  const canSubmit = form.effectiveFrom.length === 10 && !Number.isNaN(amountNum) && amountNum > 0;

  const handleSubmit = async () => {
    if (!canSubmit || isSaving) return;
    const body = {
      effectiveFrom: form.effectiveFrom,
      amount: amountNum,
      note: form.note.trim() || null,
    };
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, body });
      } else {
        await createMutation.mutateAsync(body);
      }
      toast.success(t('admin.ceiling_toastSaved'));
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
      toast.success(t('admin.ceiling_toastDeleted'));
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
            {t('admin.module_severanceCeiling_title')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
            {t('admin.ceiling_hint')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<Icon icon="mdi:plus" width={16} />}
          onClick={() => { setEditTarget(null); setFormOpen(true); }}
        >
          {t('admin.ceiling_addButton')}
        </Button>
      </Stack>

      {isLoading ? (
        <Stack spacing={1}>
          {Array.from({ length: 2 }).map((_, i) => (
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
          <Icon icon="mdi:scale-balance" width={32} />
          <Typography variant="body2" sx={{ mt: 1 }}>{t('admin.ceiling_empty')}</Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {(data ?? []).map((item) => (
            <Stack
              key={item.id}
              direction="row"
              alignItems="center"
              spacing={1.4}
              sx={{ p: 1.2, borderRadius: 1.6, border: '1px solid', borderColor: 'divider' }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: (th) => alpha(th.palette.success.main, 0.14),
                  color: 'success.main',
                  flexShrink: 0,
                }}
              >
                <Icon icon="mdi:scale-balance" width={17} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {t('admin.ceiling_effectiveFromShort', { date: formatPeriod(item.effectiveFrom) })}
                </Typography>
                {item.note ? (
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.disabled', textTransform: 'none', letterSpacing: 0 }}
                    noWrap
                  >
                    {item.note}
                  </Typography>
                ) : null}
              </Box>
              <Money value={item.amount} size="sm" weight={600} />
              <Tooltip title={t('common:edit')} arrow>
                <IconButton size="small" aria-label={t('common:edit')} onClick={() => { setEditTarget(item); setFormOpen(true); }}>
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
        title={editTarget ? t('admin.ceiling_editTitle') : t('admin.ceiling_createTitle')}
        icon="mdi:scale-balance"
        actions={
          <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit || isSaving}>
            {isSaving ? <CircularProgress size={18} /> : t('common:save')}
          </Button>
        }
      >
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            type="date"
            label={t('admin.ceiling_field_effectiveFrom')}
            value={form.effectiveFrom}
            onChange={(e) => set('effectiveFrom', e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            helperText={t('admin.ceiling_field_effectiveFromHint')}
          />
          <TextField
            label={t('admin.ceiling_field_amount')}
            value={form.amount}
            onChange={(e) => set('amount', formatAmountInput(e.target.value))}
            size="small"
            helperText={t('admin.ceiling_field_amountHint')}
          />
          <TextField
            label={t('admin.ceiling_field_note')}
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            size="small"
            placeholder={t('admin.ceiling_field_notePlaceholder')}
          />
        </Stack>
      </ZoomModal>

      <DeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('admin.ceiling_deleteTitle')}
        description={t('admin.ceiling_deleteDescription')}
        loading={deleteMutation.isPending}
      />
    </SurfaceCard>
  );
}
