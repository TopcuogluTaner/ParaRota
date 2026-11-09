import { Box, IconButton, Modal, Slide, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: string;
  width?: number | string;
  maxWidth?: number | string;
  children: ReactNode;
  actions?: ReactNode;
}

export function ZoomModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  width = '90vw',
  maxWidth = 560,
  children,
  actions,
}: Props) {
  const { t } = useTranslation('common');
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: (t) =>
              t.palette.mode === 'dark' ? alpha('#000', 0.6) : alpha('#1B130A', 0.32),
            backdropFilter: 'blur(8px) saturate(140%)',
          },
        },
      }}
    >
      {/* Positioning shell: full viewport flex-center.
          Slide's inline transform is applied to the inner Box only — so it
          never collides with our centering transform. */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          pointerEvents: 'none',
        }}
      >
        <Slide in={open} direction="up" timeout={280}>
          <Box
            sx={{
              width,
              maxWidth,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              boxShadow: (t) =>
                t.palette.mode === 'dark'
                  ? '0 30px 80px rgba(0, 0, 0, 0.6)'
                  : '0 30px 80px rgba(43, 30, 14, 0.22)',
              outline: 'none',
              overflow: 'hidden',
              pointerEvents: 'auto',
            }}
          >
            {/* header */}
            {(title || icon) && (
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                  px: 3,
                  py: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: (t) =>
                    t.palette.mode === 'dark'
                      ? alpha(t.palette.primary.main, 0.04)
                      : alpha(t.palette.primary.main, 0.04),
                }}
              >
                {icon && (
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.4,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                      color: 'primary.main',
                    }}
                  >
                    <Icon icon={icon} width={20} />
                  </Box>
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {title && (
                    <Typography
                      variant="h6"
                      sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, lineHeight: 1.2 }}
                    >
                      {title}
                    </Typography>
                  )}
                  {subtitle && (
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}
                    >
                      {subtitle}
                    </Typography>
                  )}
                </Box>
                <IconButton onClick={onClose} size="small" aria-label={t('close')}>
                  <Icon icon="mdi:close" width={18} />
                </IconButton>
              </Stack>
            )}

            {/* body */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>{children}</Box>

            {/* actions */}
            {actions && (
              <Stack
                direction="row"
                spacing={1}
                justifyContent="flex-end"
                sx={{
                  px: 3,
                  py: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  bgcolor: (t) =>
                    t.palette.mode === 'dark' ? alpha('#000', 0.16) : alpha('#1B130A', 0.02),
                }}
              >
                {actions}
              </Stack>
            )}
          </Box>
        </Slide>
      </Box>
    </Modal>
  );
}
