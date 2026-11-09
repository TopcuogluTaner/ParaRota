import { Box, Button, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { ZoomModal } from './ZoomModal';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  /** Onay butonu rengi. 'error' = tehlikeli action, 'primary' = pozitif. */
  tone?: 'error' | 'primary' | 'warning';
  icon?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  tone = 'primary',
  icon,
  confirmLabel,
  cancelLabel,
  isPending,
}: Props) {
  const { t } = useTranslation('common');
  const fallbackIcon =
    tone === 'error' ? 'mdi:alert-octagon-outline' : tone === 'warning' ? 'mdi:alert-outline' : 'mdi:help-circle-outline';

  return (
    <ZoomModal
      open={open}
      onClose={() => !isPending && onClose()}
      icon={icon ?? fallbackIcon}
      title={title}
      maxWidth={460}
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={isPending}>
            {cancelLabel ?? t('cancel')}
          </Button>
          <Button
            variant="contained"
            color={tone}
            onClick={onConfirm}
            disabled={isPending}
            startIcon={<Icon icon={tone === 'error' ? 'mdi:check' : 'mdi:check'} width={16} />}
          >
            {confirmLabel ?? t('confirm')}
          </Button>
        </>
      }
    >
      <Box sx={{ py: 0.4 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line', lineHeight: 1.55 }}>
          {body}
        </Typography>
      </Box>
    </ZoomModal>
  );
}
