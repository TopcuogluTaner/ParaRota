import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import type { CategoryDto } from '@shared/api/types';
import { useDeleteCategory } from '../api/useCategories';

interface Props {
  open: boolean;
  onClose: () => void;
  category: CategoryDto | null;
}

export function CategoryDeleteModal({ open, onClose, category }: Props) {
  const { t } = useTranslation('pages');
  const deleteMutation = useDeleteCategory();

  if (!category) return null;
  const isSystem = category.isSystem === true;

  // Gate backdrop/Escape close while mutation in flight.
  const handleClose = () => {
    if (deleteMutation.isPending) return;
    onClose();
  };

  const handleConfirm = async () => {
    if (!category || isSystem) return;
    try {
      await deleteMutation.mutateAsync(category.id);
      toast.success(t('categories.toastDeleteSuccess'));
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
        isSystem ? (
          <Button variant="contained" onClick={handleClose}>
            {t('common:close')}
          </Button>
        ) : (
          <>
            <Button variant="text" onClick={handleClose} disabled={deleteMutation.isPending}>
              {t('common:cancel')}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirm}
              disabled={deleteMutation.isPending}
              startIcon={
                deleteMutation.isPending ? (
                  <CircularProgress size={16} thickness={5} />
                ) : (
                  <Icon icon="mdi:delete-outline" width={18} />
                )
              }
            >
              {t('categories.delete')}
            </Button>
          </>
        )
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
            bgcolor: isSystem ? 'info.main' : 'error.main',
            color: 'common.white',
          }}
        >
          <Icon icon={isSystem ? 'mdi:shield-lock-outline' : 'mdi:alert-octagon-outline'} width={32} />
        </Box>
        <Typography variant="h6" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
          {isSystem ? t('categories.deleteSystemTitle') : t('categories.deleteTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 320 }}>
          {isSystem ? t('categories.deleteSystemDescription') : t('categories.deleteDescription')}
        </Typography>

        {/* Show the category being acted on as a chip */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.2}
          sx={{
            mt: 1.5,
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
      </Stack>
    </ZoomModal>
  );
}
