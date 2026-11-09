import { useMemo, useState, useEffect } from 'react';
import { Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import { ZoomModal } from '@shared/components/ZoomModal';
import type { CategoryDto } from '@shared/api/types';
import { useCategoriesQuery, useMergeCategory } from '../api/useCategories';

interface Props {
  open: boolean;
  onClose: () => void;
  category: CategoryDto | null;
}

export function CategoryMergeModal({ open, onClose, category }: Props) {
  const { t } = useTranslation('pages');
  const mergeMutation = useMergeCategory();
  const categoriesQ = useCategoriesQuery();
  const categories = categoriesQ.data;
  const [targetId, setTargetId] = useState<number | ''>('');
  // İlk başarısız "Birleştir" denemesinden sonra hedef alanını işaretle.
  const [attempted, setAttempted] = useState(false);

  // Modal her açıldığında / kategori değiştiğinde seçimi sıfırla.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetId('');
      setAttempted(false);
    }
  }, [open, category?.id]);

  // Aynı tipteki, kendisi hariç hedef adayları.
  const targets = useMemo(() => {
    if (!category) return [];
    return (categories ?? []).filter((c) => c.type === category.type && c.id !== category.id);
  }, [categories, category]);

  if (!category) return null;

  const handleClose = () => {
    if (mergeMutation.isPending) return;
    onClose();
  };

  const handleConfirm = async () => {
    if (mergeMutation.isPending) return;
    if (targetId === '') {
      setAttempted(true);
      toast.error(t('categories.merge_selectTarget'), { id: 'category-merge-validate' });
      return;
    }
    try {
      await mergeMutation.mutateAsync({ sourceId: category.id, body: { targetCategoryId: targetId } });
      toast.success(t('categories.merge_toastSuccess'));
      onClose();
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('categories.toastError')));
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={handleClose}
      maxWidth={460}
      actions={
        <>
          <Button variant="text" onClick={handleClose} disabled={mergeMutation.isPending}>
            {t('common:cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={mergeMutation.isPending || targets.length === 0}
            startIcon={
              mergeMutation.isPending ? (
                <CircularProgress size={16} thickness={5} />
              ) : (
                <Icon icon="mdi:merge" width={18} />
              )
            }
          >
            {t('categories.merge_confirm')}
          </Button>
        </>
      }
    >
      <Stack alignItems="center" spacing={2} sx={{ textAlign: 'center', py: 1 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            color: 'common.white',
          }}
        >
          <Icon icon="mdi:merge" width={32} />
        </Box>
        <Typography variant="h6" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
          {t('categories.merge_modalTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 340 }}>
          {t('categories.merge_modalDescription', { name: category.name })}
        </Typography>

        {/* Kaynak kategori chip'i */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.2}
          sx={{
            mt: 1,
            px: 1.6,
            py: 1,
            borderRadius: 1.4,
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          {category.emoji ? (
            <Box sx={{ fontSize: '1.2rem' }}>{category.emoji}</Box>
          ) : (
            <Icon icon={category.icon} width={18} style={{ color: category.color ?? 'currentColor' }} />
          )}
          <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '0.95rem' }}>
            {category.name}
          </Typography>
        </Stack>

        <TextField
          select
          fullWidth
          label={t('categories.merge_selectTarget')}
          value={targetId === '' ? '' : String(targetId)}
          onChange={(e) => setTargetId(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={mergeMutation.isPending || categoriesQ.isLoading || categoriesQ.isError || targets.length === 0}
          error={(attempted && targetId === '' && targets.length > 0) || categoriesQ.isError}
          helperText={
            categoriesQ.isLoading
              ? t('common:loading')
              : categoriesQ.isError
                ? t('categories.errorTitle')
                : targets.length === 0
                  ? t('categories.merge_noTargets')
                  : attempted && targetId === ''
                    ? t('common:required')
                    : undefined
          }
          sx={{ mt: 1 }}
        >
          {targets.map((c) => (
            <MenuItem key={c.id} value={String(c.id)}>
              <Stack direction="row" alignItems="center" spacing={1}>
                {c.emoji ? (
                  <Box component="span" sx={{ fontSize: '1.05rem' }}>
                    {c.emoji}
                  </Box>
                ) : (
                  <Icon icon={c.icon} width={16} style={{ color: c.color ?? 'currentColor' }} />
                )}
                <span>{c.name}</span>
              </Stack>
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </ZoomModal>
  );
}
