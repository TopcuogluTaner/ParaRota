import { Box, Button, Stack, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { ZoomModal } from './ZoomModal';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  loading?: boolean;
}

export function DeleteModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  loading = false,
}: Props) {
  const { t } = useTranslation('common');
  const resolvedTitle = title ?? t('deleteModal_title');
  const resolvedDescription = description ?? t('deleteModal_description');
  return (
    <ZoomModal
      open={open}
      onClose={onClose}
      maxWidth={460}
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={onConfirm}
            disabled={loading}
            startIcon={<Icon icon="mdi:delete-outline" width={18} />}
          >
            {t('delete')}
          </Button>
        </>
      }
    >
      <Stack alignItems="center" spacing={2} sx={{ textAlign: 'center', py: 2 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'error.main',
            color: 'error.contrastText',
            opacity: 0.92,
          }}
        >
          <Icon icon="mdi:alert-octagon-outline" width={32} />
        </Box>
        <Typography variant="h6" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
          {resolvedTitle}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 320 }}>
          {resolvedDescription}
        </Typography>
      </Stack>
    </ZoomModal>
  );
}
